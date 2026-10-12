import { SHOP, MENU, MAX_PER_ITEM, formatMoney, pickupDates } from './shop.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const CART_KEY = 'gdd-cart';

// ─── Cart state (remembered on this device) ───────────────────
let cart = {};
try {
  cart = JSON.parse(localStorage.getItem(CART_KEY)) || {};
} catch {}
for (const id of Object.keys(cart)) {
  const item = MENU.find((m) => m.id === id);
  if (!item || item.soldOut) delete cart[id];
}
const saveCart = () => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {}
};

// ─── Static shop text ─────────────────────────────────────────
const dates = pickupDates();
const cutoffDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][SHOP.cutoff.weekday];
const h = SHOP.cutoff.hour;
const cutoffRule = `${cutoffDay} at ${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

const fill = (sel, text) => $$(sel).forEach((el) => (el.textContent = text));
fill('[data-tagline]', SHOP.tagline);
fill('[data-cutoff-rule]', cutoffRule);
fill('[data-pickup-window]', SHOP.pickup.window);
fill('[data-pickup-location]', SHOP.pickup.location);
fill('[data-pickup-note]', SHOP.pickup.note);

const contact = $('[data-contact]');
const { email, instagram } = SHOP.contact;
contact.innerHTML = [
  email && `<a href="mailto:${email}">${email}</a>`,
  instagram && `<a href="https://instagram.com/${instagram}" target="_blank" rel="noopener">@${instagram}</a>`,
]
  .filter(Boolean)
  .join(' · ');

function humanDuration(ms) {
  const hours = Math.floor(ms / 3.6e6);
  if (hours >= 48) return `${Math.floor(hours / 24)} days`;
  if (hours >= 1) return `${hours} hr${hours === 1 ? '' : 's'}`;
  return `${Math.max(1, Math.floor(ms / 6e4))} min`;
}

const status = $('[data-status]');
if (dates.length) {
  const next = dates[0];
  status.innerHTML = `
    <span class="dot"></span>
    <span>Now taking orders for <strong>${next.label}</strong><br />
    <span class="muted">Closes ${next.cutoffLabel} · ${humanDuration(next.msUntilCutoff)} left</span></span>`;
} else {
  status.innerHTML = `<span class="dot dot-off"></span><span>We're taking a short break. Check back soon!</span>`;
}

const select = $('[data-pickup-select]');
select.innerHTML = dates.map((d) => `<option value="${d.date}">${d.label}</option>`).join('');

// ─── Menu ─────────────────────────────────────────────────────
const categories = [...new Set(MENU.map((m) => m.category))];
$('[data-menu]').innerHTML = categories
  .map(
    (cat) => `
  <h3 class="menu-cat">${cat}</h3>
  <div class="menu-grid">
    ${MENU.filter((m) => m.category === cat)
      .map(
        (m) => `
      <article class="item${m.soldOut ? ' sold-out' : ''}" data-item="${m.id}">
        <div class="item-top">
          <h4>${m.name}</h4>
          <span class="price">${formatMoney(m.price)}</span>
        </div>
        ${m.tag || m.soldOut ? `<span class="tag">${m.soldOut ? 'Sold out this week' : m.tag}</span>` : ''}
        <p>${m.description}</p>
        ${
          m.soldOut
            ? ''
            : `<div class="qty" role="group" aria-label="Quantity for ${m.name}">
                <button type="button" data-dec aria-label="Remove one">−</button>
                <output data-qty>0</output>
                <button type="button" data-inc aria-label="Add one">+</button>
              </div>`
        }
      </article>`,
      )
      .join('')}
  </div>`,
  )
  .join('');

$('[data-menu]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-inc],[data-dec]');
  if (!btn) return;
  const id = btn.closest('[data-item]').dataset.item;
  const qty = (cart[id] || 0) + (btn.hasAttribute('data-inc') ? 1 : -1);
  if (qty <= 0) delete cart[id];
  else cart[id] = Math.min(qty, MAX_PER_ITEM);
  saveCart();
  render();
});

// ─── Render cart ──────────────────────────────────────────────
function render() {
  let count = 0;
  let total = 0;
  const lines = [];
  for (const m of MENU) {
    const qty = cart[m.id] || 0;
    const card = document.querySelector(`[data-item="${m.id}"]`);
    card?.classList.toggle('in-cart', qty > 0);
    const out = card?.querySelector('[data-qty]');
    if (out) out.textContent = qty;
    if (!qty) continue;
    count += qty;
    total += qty * m.price;
    lines.push(`<li><span>${qty} × ${m.name}</span><span>${formatMoney(qty * m.price)}</span></li>`);
  }
  $('[data-cart-lines]').innerHTML =
    lines.join('') || `<li class="empty">Nothing yet. Add something from the <a href="#menu">menu</a>.</li>`;
  $('[data-cart-total]').textContent = formatMoney(total);
  $('[data-cart-bar-total]').textContent = formatMoney(total);
  $('[data-cart-count]').textContent = `${count} item${count === 1 ? '' : 's'}`;
  $('[data-cart-bar]').hidden = count === 0;
}
render();

// Hide the floating cart bar while the checkout section is on screen.
new IntersectionObserver(([entry]) => {
  document.body.classList.toggle('at-checkout', entry.isIntersecting);
}).observe($('#order'));

// ─── Checkout ─────────────────────────────────────────────────
const form = $('[data-order-form]');
const errorEl = $('[data-form-error]');
const submit = $('[data-submit]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));

  if (!items.length) return (errorEl.textContent = 'Add something from the menu first.');
  if (!dates.length) return (errorEl.textContent = "We're not taking orders right now.");
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  submit.disabled = true;
  submit.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, items }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) throw new Error(body.error || 'Checkout is not available right now.');
    try {
      sessionStorage.setItem('gdd-last-order', JSON.stringify({ name: data.name, pickupDate: data.pickupDate }));
    } catch {}
    window.location.href = body.url;
  } catch (err) {
    errorEl.textContent = err.message;
    submit.disabled = false;
    submit.textContent = 'Continue to payment';
  }
});

