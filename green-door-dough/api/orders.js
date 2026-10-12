// GET /api/orders?date=YYYY-MM-DD — the baker's list of paid orders for one Saturday.
// Protected by the ADMIN_PASSWORD environment variable.
import crypto from 'node:crypto';
import Stripe from 'stripe';
import { MENU } from '../shop.js';

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD;
  const given = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!expected || !given) return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!authorized(req)) return res.status(401).json({ error: 'Wrong password.' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'STRIPE_SECRET_KEY is not set.' });

  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Pick a date.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // Orders are placed at most a few weeks ahead, so look back 45 days before the pickup.
  const since = Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000) - 45 * 86400;

  const orders = [];
  const totals = Object.fromEntries(MENU.map((m) => [m.id, 0]));
  for await (const s of stripe.checkout.sessions.list({ limit: 100, created: { gte: since } })) {
    if (s.payment_status !== 'paid' || s.metadata?.pickup_date !== date) continue;
    const items = (s.metadata.items || '')
      .split(',')
      .filter(Boolean)
      .map((pair) => {
        const [id, qty] = pair.split(':');
        totals[id] = (totals[id] || 0) + Number(qty);
        return { id, name: MENU.find((m) => m.id === id)?.name || id, qty: Number(qty) };
      });
    orders.push({
      id: s.id,
      name: s.metadata.customer_name,
      email: s.customer_details?.email || s.customer_email,
      phone: s.metadata.phone,
      notes: s.metadata.notes,
      amount: s.amount_total,
      created: s.created,
      items,
    });
  }
  orders.sort((a, b) => a.name.localeCompare(b.name));

  return res.status(200).json({
    date,
    orders,
    totals: MENU.map((m) => ({ id: m.id, name: m.name, qty: totals[m.id] || 0 })),
    revenue: orders.reduce((s, o) => s + (o.amount || 0), 0),
  });
}
