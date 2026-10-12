// ─────────────────────────────────────────────────────────────
//  Green Door Dough — shop settings + menu
//  This is the ONE file you edit to change the menu, prices,
//  pickup details, or the weekly order cutoff. The website and
//  the payment server both read from here, so prices can't be
//  tampered with in the browser.
// ─────────────────────────────────────────────────────────────

export const SHOP = {
  name: 'Green Door Dough',
  tagline: 'Naturally leavened sourdough, baked fresh for Saturday pickup.',

  // Your local time zone — controls when the order cutoff happens.
  // Examples: 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'
  timezone: 'America/Chicago',

  pickup: {
    weekday: 6, // 0 = Sunday … 6 = Saturday
    window: '9:00 AM – 12:00 PM',
    location: '123 Main St (TODO: your pickup spot)',
    note: 'Look for the green door. Orders are bagged and labeled with your name.',
  },

  // Orders for a given Saturday close at this day/hour (in `timezone`).
  // weekday 4 = Thursday, hour 20 = 8 PM.
  cutoff: { weekday: 4, hour: 20 },

  // How many upcoming Saturdays customers can choose from.
  weeksAhead: 3,

  // Saturdays you're NOT baking (vacation, etc.), as 'YYYY-MM-DD'.
  closedDates: [],

  contact: {
    email: 'hello@greendoordough.com', // TODO
    instagram: 'greendoordough', // TODO (handle without @), or '' to hide
  },
};

// Prices are in CENTS (1200 = $12.00).
// Set soldOut: true to grey an item out for the week.
export const MENU = [
  {
    id: 'country',
    name: 'Classic Country Loaf',
    description: 'Our everyday sourdough. Crackly crust, open crumb, a gentle tang.',
    price: 1200,
    category: 'Loaves',
    tag: 'Best seller',
  },
  {
    id: 'seeded',
    name: 'Seeded Multigrain',
    description: 'Sunflower, flax, sesame and pumpkin seeds folded into a whole-wheat dough.',
    price: 1300,
    category: 'Loaves',
  },
  {
    id: 'jalapeno-cheddar',
    name: 'Jalapeño Cheddar',
    description: 'Sharp cheddar pockets and pickled jalapeño. Makes a dangerous grilled cheese.',
    price: 1400,
    category: 'Loaves',
  },
  {
    id: 'cinnamon-raisin',
    name: 'Cinnamon Raisin',
    description: 'Plump raisins and a cinnamon-sugar swirl. Toast it, butter it.',
    price: 1300,
    category: 'Loaves',
  },
  {
    id: 'focaccia',
    name: 'Rosemary Sea Salt Focaccia',
    description: 'Half-sheet of olive-oil focaccia, dimpled with rosemary and flaky salt.',
    price: 1000,
    category: 'Bakes',
  },
  {
    id: 'cinnamon-rolls',
    name: 'Sourdough Cinnamon Rolls (4)',
    description: 'Soft, slow-fermented rolls with cream-cheese icing on the side.',
    price: 1600,
    category: 'Sweets',
    tag: 'Limited',
  },
  {
    id: 'cookies',
    name: 'Brown Butter Chocolate Chip Cookies (6)',
    description: 'Made with sourdough discard, brown butter and dark chocolate chunks.',
    price: 1200,
    category: 'Sweets',
  },
];

export const MAX_PER_ITEM = 10;

// ─── Helpers shared by the website and the server ─────────────

export function formatMoney(cents) {
  return '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
}

// Current wall-clock time in the shop's time zone, expressed as a
// UTC timestamp (so plain UTC date math works on it).
function wallNow(now, tz) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
}

const DAY = 24 * 60 * 60 * 1000;
const fmtUTC = (ms, opts) => new Date(ms).toLocaleString('en-US', { timeZone: 'UTC', ...opts });
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

// The Saturdays a customer can still order for, soonest first.
export function pickupDates(now = new Date(), shop = SHOP) {
  const nowWall = wallNow(now, shop.timezone);
  const today = Math.floor(nowWall / DAY) * DAY;
  const weekday = new Date(today).getUTCDay();
  const first = today + ((shop.pickup.weekday - weekday + 7) % 7) * DAY;
  const daysBefore = (shop.pickup.weekday - shop.cutoff.weekday + 7) % 7 || 7;

  const out = [];
  for (let i = 0; out.length < shop.weeksAhead && i < shop.weeksAhead + 8; i++) {
    const day = first + i * 7 * DAY;
    const cutoff = day - daysBefore * DAY + shop.cutoff.hour * 60 * 60 * 1000;
    const date = isoDate(day);
    if (nowWall >= cutoff || shop.closedDates.includes(date)) continue;
    out.push({
      date,
      label: fmtUTC(day, { weekday: 'long', month: 'short', day: 'numeric' }),
      shortLabel: fmtUTC(day, { weekday: 'short', month: 'short', day: 'numeric' }),
      cutoffLabel:
        fmtUTC(cutoff, { weekday: 'long', month: 'short', day: 'numeric' }) +
        ' at ' +
        fmtUTC(cutoff, { hour: 'numeric', minute: '2-digit' }).replace(':00', ''),
      msUntilCutoff: cutoff - nowWall,
    });
  }
  return out;
}

// Turn [{id, qty}] into priced line items. Throws on anything invalid.
export function priceOrder(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Your cart is empty.');
  const lines = [];
  const seen = new Set();
  for (const { id, qty } of items) {
    const item = MENU.find((m) => m.id === id);
    if (!item) throw new Error('One of the items in your cart is no longer on the menu.');
    if (item.soldOut) throw new Error(`${item.name} is sold out this week.`);
    if (seen.has(id)) throw new Error('Duplicate item in cart.');
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_PER_ITEM) {
      throw new Error(`Quantity for ${item.name} must be between 1 and ${MAX_PER_ITEM}.`);
    }
    seen.add(id);
    lines.push({ id, name: item.name, price: item.price, qty, total: item.price * qty });
  }
  return { lines, subtotal: lines.reduce((s, l) => s + l.total, 0) };
}
