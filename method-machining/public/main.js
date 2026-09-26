// Mobile menu
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
nav.addEventListener("click", (e) => {
  if (e.target.closest("a")) {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

// Quote form
const form = document.getElementById("quote-form");
const statusEl = form.querySelector(".form-status");
const submitBtn = form.querySelector("button[type=submit]");

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = "form-status " + (kind || "");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  let firstBad = null;
  for (const el of form.querySelectorAll("[required]")) {
    const bad = !el.value.trim() || (el.type === "email" && !el.checkValidity());
    el.setAttribute("aria-invalid", String(bad));
    if (bad && !firstBad) firstBad = el;
  }
  if (firstBad) {
    setStatus("Please fill in your name, a valid email, and project details.", "err");
    firstBad.focus();
    return;
  }

  submitBtn.disabled = true;
  setStatus("Sending…");
  try {
    const res = await fetch(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    if (!res.ok) throw new Error(await res.text());
    form.reset();
    setStatus("Thanks! Your request was sent. We'll get back to you within 1–2 business days.", "ok");
  } catch {
    const email = document.querySelector(".contact-list a[href^='mailto:']").textContent;
    setStatus(`Sorry, something went wrong. Please email us directly at ${email}.`, "err");
  } finally {
    submitBtn.disabled = false;
  }
});
