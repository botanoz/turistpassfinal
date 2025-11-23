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
    const { passId, passName, days, adults, children, adultPrice, childPrice, discount, discountCode } = body;

    const adultCount = Number(adults) || 0;
    const childCount = Number(children) || 0;
    const adultUnitPrice = Number(adultPrice) || 0;
    const childUnitPrice = Number(childPrice) || 0;
    const discountPercentage = discount ? Number(discount.percentage) || 0 : 0;

    // Calculate totals
    const adultTotal = adultCount * adultUnitPrice;
    const childTotal = childCount * childUnitPrice;
    const subtotal = adultTotal + childTotal;

    // Calculate discount (either from pass discount or discount code)
    let discountAmount = subtotal > 0 ? (subtotal * discountPercentage) / 100 : 0;
    let discountCodeId = null;
    let appliedDiscountCode = null;

    // If discount code is provided, validate and apply it
    if (discountCode && discountCode.trim()) {
      try {
        const { data: validationResult, error: validationError } = await serviceSupabase
          .rpc('validate_discount_code', {
            p_code: discountCode.trim(),
            p_customer_id: user.id,
            p_subtotal: subtotal,
            p_pass_id: passId || null,
          });

        if (!validationError && validationResult && validationResult.length > 0) {
          const result = validationResult[0];
          if (result.is_valid) {
            // Apply discount code (replaces any pass discount)
            discountAmount = Number(result.discount_amount) || 0;
            discountCodeId = result.discount_code_id;
            appliedDiscountCode = discountCode.trim().toUpperCase();
          }
        }
      } catch (codeError) {
        console.error('Error validating discount code:', codeError);
        // Continue without discount code if validation fails
      }
    }

    const totalAmount = Math.max(subtotal - discountAmount, 0);

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // Create order in database
    const { data: order, error: orderError } = await serviceSupabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
        status: 'completed',
        total_amount: totalAmount,
        currency: 'USD',
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
        unit_price: adultUnitPrice,
        total_price: adultTotal
      });
    }

    if (childCount > 0) {
      items.push({
        order_id: order.id,
        pass_id: passId,
        pass_name: `${passName} - ${days} day${days > 1 ? 's' : ''} (Child)`,
        pass_type: `${days}-day-child`,
        quantity: childCount,
        unit_price: childUnitPrice,
        total_price: childTotal
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
    const purchasedPasses = [];
    const validityDays = Number(days) || 0; // Pass valid for selected number of days
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + validityDays);

    // Generate passes for adults
    for (let i = 0; i < adultCount; i++) {
      const { data: qrCode } = await serviceSupabase.rpc('generate_activation_code');
      const { data: pinCode } = await serviceSupabase.rpc('generate_pin_code');

      purchasedPasses.push({
        customer_id: user.id,
        order_id: order.id,
        pass_name: passName,
        pass_type: `${days}-day-adult`,
        activation_code: qrCode || `PASS-${Date.now()}-${i}`,
        pin_code: pinCode || String(Math.floor(100000 + Math.random() * 900000)),
        expiry_date: expiryDate.toISOString(),
        status: 'active'
      });
    }

    // Generate passes for children
    for (let i = 0; i < childCount; i++) {
      const { data: qrCode } = await serviceSupabase.rpc('generate_activation_code');
      const { data: pinCode } = await serviceSupabase.rpc('generate_pin_code');

      purchasedPasses.push({
        customer_id: user.id,
        order_id: order.id,
        pass_name: passName,
        pass_type: `${days}-day-child`,
        activation_code: qrCode || `PASS-${Date.now()}-${i}`,
        pin_code: pinCode || String(Math.floor(100000 + Math.random() * 900000)),
        expiry_date: expiryDate.toISOString(),
        status: 'active'
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
            discount_amount: discountAmount,
            order_subtotal: subtotal,
            order_total: totalAmount,
          });
      } catch (usageError) {
        console.error('Error recording discount code usage:', usageError);
        // Don't fail the order if this fails
      }
    }

    console.log('Order created successfully:', order.id, orderNumber);
    console.log('Created', purchasedPasses.length, 'purchased passes');
    if (appliedDiscountCode) {
      console.log('Applied discount code:', appliedDiscountCode, 'Amount:', discountAmount);
    }

    return NextResponse.json({
      success: true,
      simulated: true, // Payment is simulated
      message: 'Order created successfully. Payment was simulated - no actual charge made.',
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalAmount,
        subtotal,
        discountAmount,
        discountCode: appliedDiscountCode,
        items: {
          adults: adultCount,
          children: childCount,
          adultPrice: adultUnitPrice,
          childPrice: childUnitPrice
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
