// Quick sanity checks: `npm test`
import assert from 'node:assert/strict';
import { SHOP, pickupDates, priceOrder } from './shop.js';
import checkout from './api/checkout.js';

const shop = { ...SHOP, timezone: 'America/Chicago', cutoff: { weekday: 4, hour: 20 }, closedDates: [] };
// 2026-10-12 is a Monday.
const at = (iso) => pickupDates(new Date(iso), shop).map((d) => d.date);

assert.deepEqual(at('2026-10-12T15:00:00Z'), ['2026-10-17', '2026-10-24', '2026-10-31']);
// Thu Oct 15, 7:59 PM Chicago (CDT = UTC-5) → this Saturday still open
assert.equal(at('2026-10-16T00:59:00Z')[0], '2026-10-17');
// Thu Oct 15, 8:00 PM Chicago → closed, next one is Oct 24
assert.equal(at('2026-10-16T01:00:00Z')[0], '2026-10-24');
// Saturday morning → next week
assert.equal(at('2026-10-17T14:00:00Z')[0], '2026-10-24');
// Closed dates are skipped
assert.deepEqual(pickupDates(new Date('2026-10-12T15:00:00Z'), { ...shop, closedDates: ['2026-10-24'] }).map((d) => d.date),
  ['2026-10-17', '2026-10-31', '2026-11-07']);
assert.match(pickupDates(new Date('2026-10-12T15:00:00Z'), shop)[0].cutoffLabel, /Thursday, Oct 15 at 8 PM/);

assert.equal(priceOrder([{ id: 'country', qty: 2 }, { id: 'cookies', qty: 1 }]).subtotal, 3600);
assert.throws(() => priceOrder([]), /empty/);
assert.throws(() => priceOrder([{ id: 'nope', qty: 1 }]), /menu/);
assert.throws(() => priceOrder([{ id: 'country', qty: 0 }]), /between/);
assert.throws(() => priceOrder([{ id: 'country', qty: 1.5 }]), /between/);

function mockRes() {
  return { code: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
}
const call = async (body, method = 'POST') => { const r = mockRes(); await checkout({ method, body, headers: { host: 'x' } }, r); return r; };

delete process.env.STRIPE_SECRET_KEY;
assert.equal((await call({})).code, 503);
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
assert.equal((await call({}, 'GET')).code, 405);
const good = { name: 'Sam', email: 'sam@example.com', phone: '555-123-4567', pickupDate: pickupDates()[0].date, items: [{ id: 'country', qty: 1 }] };
assert.match((await call({ ...good, email: 'bad' })).body.error, /email/);
assert.match((await call({ ...good, pickupDate: '2020-01-04' })).body.error, /closed/);
assert.match((await call({ ...good, items: [{ id: 'country', qty: 99 }] })).body.error, /between/);
assert.equal((await call('{not json')).code, 400);

console.log('All tests passed ✓');
