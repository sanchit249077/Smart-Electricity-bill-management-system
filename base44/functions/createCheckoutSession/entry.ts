import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const billId = body?.bill_id;
    if (!billId) return Response.json({ error: 'bill_id is required' }, { status: 400 });

    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    const bill = await base44.asServiceRole.entities.Bill.get(billId);
    if (!bill) return Response.json({ error: 'Bill not found' }, { status: 404 });

    const canAccessAnyBill = actor?.role === 'admin' || actor?.role === 'staff';
    if (!canAccessAnyBill && bill.customer_id !== actor?.id) {
      return Response.json({ error: 'You are not allowed to pay this bill' }, { status: 403 });
    }

    const balance = bill.total_amount - (bill.amount_paid || 0);
    if (balance <= 0) return Response.json({ error: 'Bill is already fully paid' }, { status: 400 });

    const secretKey = secrets.get('STRIPE_SECRET_KEY');
    const appId = secrets.get('BASE44_APP_ID');
    if (!secretKey) return Response.json({ error: 'Stripe is not configured' }, { status: 503 });

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('payment_method_types[]', 'card');
    params.append('payment_method_types[]', 'upi');
    params.append('line_items[0][quantity]', '1');
    params.append('line_items[0][price_data][currency]', 'inr');
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(balance * 100)));
    params.append('line_items[0][price_data][product_data][name]', `Electricity Bill ${bill.bill_number}`);
    params.append('line_items[0][price_data][product_data][description]', `${bill.units_consumed} kWh consumed`);
    params.append('success_url', 'https://congenial-watt-wise-flow.base44.app/bills?payment=success');
    params.append('cancel_url', 'https://congenial-watt-wise-flow.base44.app/bills?payment=cancelled');
    params.append('metadata[base44_app_id]', appId || '');
    params.append('metadata[bill_id]', billId);
    params.append('metadata[customer_id]', bill.customer_id || '');

    const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Stripe-Version': '2025-10-29.clover',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: params,
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('Stripe checkout session error:', JSON.stringify(err));
      return Response.json({ error: err?.error?.message || 'Failed to create checkout session' }, { status: 502 });
    }

    const session = await resp.json();
    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('createCheckoutSession error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}