// ---- Mobile nav toggle ----
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');

toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
});

// Close menu when a link is tapped
menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});

// ---- Current year in footer ----
document.getElementById('year').textContent = new Date().getFullYear();

// ---- Booking form ----
const form = document.getElementById('bookingForm');
const note = document.getElementById('formNote');

form.addEventListener('submit', async (e) => {
  const action = form.getAttribute('action') || '';

  // If the form endpoint hasn't been configured yet, fall back to email.
  if (action.includes('your-form-id')) {
    e.preventDefault();
    const name = encodeURIComponent(form.name.value || '');
    const phone = encodeURIComponent(form.phone.value || '');
    const email = encodeURIComponent(form.email.value || '');
    const service = encodeURIComponent(form.service.value || '');
    const message = encodeURIComponent(form.message.value || '');
    const body = `Name: ${name}%0D%0APhone: ${phone}%0D%0AEmail: ${email}%0D%0AService: ${service}%0D%0A%0D%0A${message}`;
    window.location.href =
      `mailto:info@rangereadycleaning.com?subject=${encodeURIComponent('Booking request — ' + (form.name.value || 'Website'))}&body=${body}`;
    note.classList.remove('error');
    note.textContent = 'Opening your email app to send the request…';
    return;
  }

  // Otherwise submit via fetch (works with Formspree / Cloudflare / Web3Forms).
  e.preventDefault();
  note.classList.remove('error');
  note.textContent = 'Sending…';
  try {
    const res = await fetch(action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      form.reset();
      note.textContent = 'Thanks! We got your request and will be in touch soon.';
    } else {
      throw new Error('Bad response');
    }
  } catch (err) {
    note.classList.add('error');
    note.textContent = 'Something went wrong. Please call us at (262) 957-4242.';
  }
});
