import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = session.user.id;

    // Get order with customer and items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        payment_method,
        total_amount,
        currency,
        created_at,
        receipt_url,
        customer_profiles!orders_customer_id_fkey (
          first_name,
          last_name,
          email,
          phone
        ),
        order_items (
          id,
          pass_id,
          quantity,
          unit_price,
          total_price,
          passes (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return NextResponse.json(
        { success: false, error: 'Order not found', details: orderError?.message },
        { status: 404 }
      );
    }

    // If admin has uploaded a receipt, redirect to that URL
    if (order.receipt_url) {
      // For uploaded documents, redirect to the storage URL
      return NextResponse.redirect(new URL(order.receipt_url), 302);
    }

    // Generate HTML receipt (same as invoice but labeled as receipt)
    const receiptHTML = generateReceiptHTML(order);

    // Return HTML that can be printed as PDF
    return new NextResponse(receiptHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Error generating receipt:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateReceiptHTML(order: any): string {
  const customer = order.customer_profiles;
  const items = order.order_items || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'TRY') => {
    const symbols: Record<string, string> = {
      TRY: '₺',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
    };
    return `${symbols[currency] || currency} ${amount.toFixed(2)}`;
  };

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${order.order_number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: #f5f5f5;
    }

    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #10b981;
    }

    .company-info h1 {
      color: #10b981;
      font-size: 32px;
      margin-bottom: 8px;
    }

    .company-info p {
      color: #666;
      font-size: 14px;
    }

    .receipt-info {
      text-align: right;
    }

    .receipt-info h2 {
      color: #333;
      font-size: 24px;
      margin-bottom: 8px;
    }

    .receipt-info p {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .details-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }

    .detail-box h3 {
      color: #333;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-box p {
      color: #666;
      font-size: 14px;
      margin-bottom: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    thead {
      background: #f8fafc;
    }

    th {
      text-align: left;
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
    }

    th:last-child,
    td:last-child {
      text-align: right;
    }

    td {
      padding: 16px 12px;
      font-size: 14px;
      color: #333;
      border-bottom: 1px solid #e2e8f0;
    }

    tbody tr:hover {
      background: #f8fafc;
    }

    .totals {
      margin-left: auto;
      width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }

    .total-row.final {
      border-top: 2px solid #10b981;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #10b981;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-completed {
      background: #dcfce7;
      color: #166534;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    .footer p {
      margin-bottom: 4px;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .receipt-container {
        box-shadow: none;
        padding: 40px;
      }

      @page {
        margin: 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div class="company-info">
        <h1>TuristPass</h1>
        <p>Istanbul City Pass & Tourist Services</p>
        <p>info@turistpass.com</p>
        <p>+90 (212) 123 45 67</p>
      </div>
      <div class="receipt-info">
        <h2>RECEIPT</h2>
        <p><strong>Receipt Number:</strong> ${order.order_number}</p>
        <p><strong>Date:</strong> ${formatDate(order.created_at)}</p>
        <p><strong>Payment Status:</strong> <span class="status-badge status-${order.payment_status}">${order.payment_status}</span></p>
      </div>
    </div>

    <div class="details-section">
      <div class="detail-box">
        <h3>Customer</h3>
        <p><strong>${customer.first_name} ${customer.last_name}</strong></p>
        <p>${customer.email}</p>
        ${customer.phone ? `<p>${customer.phone}</p>` : ''}
      </div>

      <div class="detail-box">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${order.order_number}</p>
        <p><strong>Payment Method:</strong> ${order.payment_method || 'N/A'}</p>
        <p><strong>Currency:</strong> ${order.currency || 'TRY'}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item: any) => `
          <tr>
            <td>
              <strong>${item.passes?.name || 'Pass'}</strong>
            </td>
            <td style="text-align: center;">${item.quantity || 1}</td>
            <td style="text-align: right;">${formatCurrency(item.unit_price, order.currency)}</td>
            <td style="text-align: right;">${formatCurrency(item.total_price, order.currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row final">
        <span>Total Paid</span>
        <span>${formatCurrency(order.total_amount, order.currency)}</span>
      </div>
    </div>

    <div class="footer">
      <p><strong>Thank you for your payment!</strong></p>
      <p>For questions about this receipt, please contact us at billing@turistpass.com</p>
      <p>TuristPass - Making Istanbul Tourism Better</p>
    </div>
  </div>

  <script>
    // Auto-print when opened in new window
    if (window.location.search.includes('print=true')) {
      window.onload = function() {
        window.print();
      };
    }
  </script>
</body>
</html>
  `.trim();
}
