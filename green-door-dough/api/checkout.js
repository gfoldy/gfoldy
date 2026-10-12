// POST /api/checkout — validates the order and creates a Stripe Checkout page.
// Prices come from shop.js on the server, never from the browser.
import Stripe from 'stripe';
import { SHOP, pickupDates, priceOrder } from '../shop.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Online payments are not set up yet. Please check back soon!' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid request.' });
    }
  }
  body ||= {};

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const phone = clean(body.phone, 20);
  const notes = clean(body.notes, 300);
  if (!name) return res.status(400).json({ error: 'Please enter a name for the order.' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email.' });
  if (phone.replace(/\D/g, '').length < 7) return res.status(400).json({ error: 'Please enter a valid phone number.' });

  const pickup = pickupDates().find((d) => d.date === body.pickupDate);
  if (!pickup) {
    return res.status(400).json({ error: 'That pickup day is closed for orders. Please refresh and pick another Saturday.' });
  }

  let order;
  try {
    order = priceOrder(body.items);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const origin = process.env.SITE_URL?.replace(/\/$/, '') || `https://${req.headers.host}`;
  const metadata = {
    pickup_date: pickup.date,
    customer_name: name,
    phone,
    notes,
    // compact "id:qty" list used by the bake sheet
    items: order.lines.map((l) => `${l.id}:${l.qty}`).join(','),
  };

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: order.lines.map((l) => ({
        quantity: l.qty,
        price_data: { currency: 'usd', unit_amount: l.price, product_data: { name: l.name } },
      })),
      metadata,
      payment_intent_data: {
        description: `${SHOP.name} · pickup ${pickup.shortLabel} · ${name}`,
        metadata,
      },
      custom_text: {
        submit: { message: `Pickup ${pickup.label}, ${SHOP.pickup.window} at ${SHOP.pickup.location}.` },
      },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#order`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error', err);
    return res.status(502).json({ error: 'Could not start checkout. Please try again in a minute.' });
  }
}
