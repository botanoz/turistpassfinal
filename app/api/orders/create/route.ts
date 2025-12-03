import { NextResponse } from 'next/server';
import { createClient as createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const serviceSupabase = createAdminClient();

    // DEBUG: Check what JWT role is being used
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      try {
        const base64Url = serviceRoleKey.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        console.log('🔍 Service role JWT payload:', payload);
        console.log('🔍 JWT role:', payload.role);
      } catch (e) {
        console.error('Failed to decode JWT:', e);
      }
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { data: existingProfiles, error: profileLookupError } = await serviceSupabase
      .from('customer_profiles')
      .select('id')
      .eq('id', user.id);

    if (profileLookupError) {
      console.error('Error checking customer profile:', profileLookupError);
      throw profileLookupError;
    }

    if (!existingProfiles || existingProfiles.length === 0) {
      const { error: profileCreateError } = await serviceSupabase
        .from('customer_profiles')
        .insert({
          id: user.id,
          email: user.email,
          first_name: user.user_metadata?.first_name || null,
          last_name: user.user_metadata?.last_name || null,
          status: 'active'
        });

      if (profileCreateError) {
        console.error('Error creating customer profile:', profileCreateError);
        throw profileCreateError;
      }
    }

    const body = await request.json();
    const { passId, passName, days, adults, children, discount, discountCode, currency: requestedCurrency } = body;

    // Determine target currency (default to TRY if not specified or invalid)
    const targetCurrency = (requestedCurrency || '').toString().toUpperCase() || 'TRY';

    const adultCount = Number(adults) || 0;
    const childCount = Number(children) || 0;
    const discountPercentage = discount ? Number(discount.percentage) || 0 : 0;

    // Resolve exchange rate for target currency (TRY base)
    let exchangeRate = 1; // TRY per unit target currency
    if (targetCurrency !== 'TRY') {
      const { data: currencyRow } = await serviceSupabase
        .from('currency_settings')
        .select('exchange_rate')
        .eq('currency_code', targetCurrency)
        .eq('is_active', true)
        .maybeSingle();
      if (currencyRow?.exchange_rate) {
        exchangeRate = Number(currencyRow.exchange_rate) || 1;
      } else {
        console.warn('Currency not found, falling back to TRY', targetCurrency);
      }
    }

    // Fetch pass pricing from DB to avoid trusting client prices
    const { data: pricingRows, error: pricingError } = await serviceSupabase
      .from('pass_pricing')
      .select('age_group, days, price, price_usd, price_eur, price_gbp, price_jpy, currency_code')
      .eq('pass_id', passId)
      .eq('days', days)
      .in('age_group', ['adult', 'child']);

    if (pricingError) {
      console.error('Error fetching pass pricing:', pricingError);
      throw pricingError;
    }

    const priceFieldMap: Record<string, string> = {
      TRY: 'price',
      USD: 'price_usd',
      EUR: 'price_eur',
      GBP: 'price_gbp',
      JPY: 'price_jpy',
    };

    const resolvePrice = (age: 'adult' | 'child'): { tryPrice: number; targetPrice: number } => {
      const row = pricingRows?.find((p) => p.age_group === age);
      if (!row) return { tryPrice: 0, targetPrice: 0 };

      const basePriceTRY = Number(row.price) || 0; // stored as TRY base
      const field = priceFieldMap[targetCurrency] || 'price';
      const precomputed = Number((row as any)[field]) || null;
      const targetPrice = precomputed && precomputed > 0
        ? precomputed
        : targetCurrency === 'TRY'
          ? basePriceTRY
          : basePriceTRY / exchangeRate;

      return { tryPrice: basePriceTRY, targetPrice };
    };

    const adultPricing = resolvePrice('adult');
    const childPricing = resolvePrice('child');

    // Totals in target currency
    const adultTotalTarget = adultCount * adultPricing.targetPrice;
    const childTotalTarget = childCount * childPricing.targetPrice;
    const subtotalTarget = adultTotalTarget + childTotalTarget;

    // Totals in base TRY (for discount validation)
    const adultTotalTRY = adultCount * adultPricing.tryPrice;
    const childTotalTRY = childCount * childPricing.tryPrice;
    const subtotalTRY = adultTotalTRY + childTotalTRY;

    // Calculate discount (pass-level percentage) in target currency
    let discountAmountTarget = subtotalTarget > 0 ? (subtotalTarget * discountPercentage) / 100 : 0;
    let discountCodeId = null;
    let appliedDiscountCode = null;

    // If discount code is provided, validate and apply it (validation in TRY, convert result)
    if (discountCode && discountCode.trim()) {
      try {
        const { data: validationResult, error: validationError } = await serviceSupabase
          .rpc('validate_discount_code', {
            p_code: discountCode.trim(),
            p_customer_id: user.id,
            p_subtotal: subtotalTRY,
            p_pass_id: passId || null,
          });

        if (!validationError && validationResult && validationResult.length > 0) {
          const result = validationResult[0];
          if (result.is_valid) {
            const discountTRY = Number(result.discount_amount) || 0;
            discountAmountTarget = targetCurrency === 'TRY' ? discountTRY : discountTRY / exchangeRate;
            discountCodeId = result.discount_code_id;
            appliedDiscountCode = discountCode.trim().toUpperCase();
          }
        }
      } catch (codeError) {
        console.error('Error validating discount code:', codeError);
        // Continue without discount code if validation fails
      }
    }

    const totalAmountTarget = Math.max(subtotalTarget - discountAmountTarget, 0);

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // Create order in database
    const { data: order, error: orderError } = await serviceSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        status: 'completed',
        subtotal: subtotalTarget,
        discount_amount: discountAmountTarget,
        total_amount: totalAmountTarget,
        currency: targetCurrency,
        currency_code: targetCurrency, // Also set currency_code for compatibility
        discount_code_id: discountCodeId,
        payment_method: 'credit_card',
        payment_status: 'completed', // SIMULATED - payment is auto-approved
        payment_id: `SIM-PAY-${Date.now()}`, // Simulated payment ID
        notes: 'Simulated order - Payment not actually processed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      throw orderError;
    }

    // Create order items
    const items = [];

    if (adultCount > 0) {
      items.push({
        order_id: order.id,
        pass_id: passId,
        pass_name: `${passName} - ${days} day${days > 1 ? 's' : ''} (Adult)`,
        pass_type: `${days}-day-adult`,
        quantity: adultCount,
        unit_price: adultPricing.targetPrice,
        total_price: adultTotalTarget
      });
    }

    if (childCount > 0) {
      items.push({
        order_id: order.id,
        pass_id: passId,
        pass_name: `${passName} - ${days} day${days > 1 ? 's' : ''} (Child)`,
        pass_type: `${days}-day-child`,
        quantity: childCount,
        unit_price: childPricing.targetPrice,
        total_price: childTotalTarget
      });
    }

    if (items.length > 0) {
      const { error: itemsError } = await serviceSupabase
        .from('order_items')
        .insert(items);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw itemsError;
      }
    }

    // Create purchased passes with QR and PIN codes
    // NOTE: Passes start as 'pending_activation' - customer must manually activate them
    // This allows purchasing passes in advance without starting the timer immediately
    const purchasedPasses = [];

    // Generate passes for adults
    for (let i = 0; i < adultCount; i++) {
      const { data: qrCode } = await serviceSupabase.rpc('generate_activation_code');
      const { data: pinCode } = await serviceSupabase.rpc('generate_pin_code');

      purchasedPasses.push({
        customer_id: user.id,
        order_id: order.id,
        pass_id: passId, // Link to passes table for duration lookup
        pass_name: passName,
        pass_type: `${days}-day-adult`,
        activation_code: qrCode || `PASS-${Date.now()}-${i}`,
        pin_code: pinCode || String(Math.floor(100000 + Math.random() * 900000)),
        activation_date: null, // Will be set when customer activates
        expiry_date: null, // Will be calculated when customer activates
        status: 'pending_activation' // Customer must activate to start timer
      });
    }

    // Generate passes for children
    for (let i = 0; i < childCount; i++) {
      const { data: qrCode } = await serviceSupabase.rpc('generate_activation_code');
      const { data: pinCode } = await serviceSupabase.rpc('generate_pin_code');

      purchasedPasses.push({
        customer_id: user.id,
        order_id: order.id,
        pass_id: passId, // Link to passes table for duration lookup
        pass_name: passName,
        pass_type: `${days}-day-child`,
        activation_code: qrCode || `PASS-${Date.now()}-${i}`,
        pin_code: pinCode || String(Math.floor(100000 + Math.random() * 900000)),
        activation_date: null, // Will be set when customer activates
        expiry_date: null, // Will be calculated when customer activates
        status: 'pending_activation' // Customer must activate to start timer
      });
    }

    if (purchasedPasses.length > 0) {
      const { error: passesError } = await serviceSupabase
        .from('purchased_passes')
        .insert(purchasedPasses);

      if (passesError) {
        console.error('Error creating purchased passes:', passesError);
        throw passesError;
      }
    }

    // Record discount code usage if applicable
    if (discountCodeId && appliedDiscountCode) {
      try {
        await serviceSupabase
          .from('discount_code_usage')
          .insert({
            discount_code_id: discountCodeId,
            customer_id: user.id,
            order_id: order.id,
            code_used: appliedDiscountCode,
            discount_amount: discountAmountTarget,
            order_subtotal: subtotalTarget,
            order_total: totalAmountTarget,
          });
      } catch (usageError) {
        console.error('Error recording discount code usage:', usageError);
        // Don't fail the order if this fails
      }
    }

    console.log('Order created successfully:', order.id, orderNumber);
    console.log('Created', purchasedPasses.length, 'purchased passes');
    console.log('Currency:', targetCurrency, 'Total:', totalAmountTarget);
    if (appliedDiscountCode) {
      console.log('Applied discount code:', appliedDiscountCode, 'Amount:', discountAmountTarget);
    }

    return NextResponse.json({
      success: true,
      simulated: true, // Payment is simulated
      message: 'Order created successfully. Payment was simulated - no actual charge made.',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalAmount: totalAmountTarget,
        subtotal: subtotalTarget,
        discountAmount: discountAmountTarget,
        currency: targetCurrency,
        discountCode: appliedDiscountCode,
        items: {
          adults: adultCount,
          children: childCount,
          adultPrice: adultPricing.targetPrice,
          childPrice: childPricing.targetPrice
        }
      }
    });

  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create order'
    }, { status: 500 });
  }
}
