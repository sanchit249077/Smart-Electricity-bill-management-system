import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

async function constructStripeEvent(body: string, signatureHeader: string, secret: string) {
  const parts: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.split('=');
    parts[k] = v;
  }
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) throw new Error('Invalid Stripe signature header');

  const timestampNumber = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampNumber)) throw new Error('Invalid Stripe timestamp');
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestampNumber);
  if (age > 300) throw new Error('Timestamp outside tolerance');

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const expectedBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const validSignature = signatureHeader.split(',')
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .some((candidate) => candidate === expectedHex);
  if (!validSignature) throw new Error('Invalid Stripe signature');

  return JSON.parse(body);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = secrets.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    const event = await constructStripeEvent(body, signature, webhookSecret);

    // Skip Base44 merchant self-test checkouts
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data?.object;
      if (session?.metadata?.base44_test_checkout === 'true') {
        return Response.json({ received: true, skipped: 'test_checkout' });
      }
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data?.object;
      const billId = session?.metadata?.bill_id;
      const customerId = session?.metadata?.customer_id;

      if (billId && session?.payment_status === 'paid') {
        const bill = await base44.asServiceRole.entities.Bill.get(billId);
        if (bill) {
          const existingPayments = await base44.asServiceRole.entities.Payment.filter({ transaction_id: session.id }, '-created_date', 1);
          if (existingPayments?.length) {
            return Response.json({ received: true, duplicate: true });
          }
          const paidAmount = (session.amount_total || 0) / 100;
          if (paidAmount <= 0) return Response.json({ received: true, skipped: 'invalid_amount' });
          const remainingBalance = Math.max(0, bill.total_amount - (bill.amount_paid || 0));
          if (paidAmount > remainingBalance + 0.01) {
            return Response.json({ received: true, skipped: 'amount_exceeds_balance' });
          }
          const newPaid = (bill.amount_paid || 0) + paidAmount;
          await base44.asServiceRole.entities.Bill.update(billId, {
            amount_paid: newPaid,
            status: newPaid >= bill.total_amount ? 'paid' : 'partially_paid',
          });
          const paymentTypes = Array.isArray(session.payment_method_types) ? session.payment_method_types : [];
          const method = paymentTypes.length === 1 && (paymentTypes[0] === 'card' || paymentTypes[0] === 'upi')
            ? paymentTypes[0]
            : 'auto';
          await base44.asServiceRole.entities.Payment.create({
            bill_id: billId,
            customer_id: customerId || bill.customer_id,
            customer_name: bill.customer_name || '',
            amount: paidAmount,
            method,
            transaction_id: session.id,
            status: 'success',
            payment_date: new Date().toISOString().slice(0, 10),
          });
          const notifyUserId = customerId || bill.customer_id;
          if (notifyUserId) {
            await base44.asServiceRole.entities.Notification.create({
              user_id: notifyUserId,
              title: 'Payment Successful',
              message: `Your payment of ₹${paidAmount} for bill ${bill.bill_number} was successful.`,
              type: 'payment_success',
              read: false,
            });
          }
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}