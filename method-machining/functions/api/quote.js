// Cloudflare Pages Function: POST /api/quote
// Emails quote requests via Resend (https://resend.com).
// Required environment variables (Pages project > Settings > Variables and Secrets):
//   RESEND_API_KEY  - secret API key from Resend
//   QUOTE_TO        - inbox that receives requests, e.g. info@methodmachining.com
//   QUOTE_FROM      - verified sender, e.g. "Method Machining Website <quotes@methodmachining.com>"

const FIELDS = {
  name: 100,
  company: 120,
  email: 160,
  phone: 40,
  material: 100,
  quantity: 40,
  needed_by: 20,
  details: 5000,
};

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  // Honeypot: pretend success so bots don't retry.
  if (body.website) return new Response("OK");

  const data = {};
  for (const [key, max] of Object.entries(FIELDS)) {
    data[key] = String(body[key] ?? "").trim().slice(0, max);
  }
  if (!data.name || !data.details || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return new Response("Missing required fields", { status: 400 });
  }

  if (!env.RESEND_API_KEY || !env.QUOTE_TO || !env.QUOTE_FROM) {
    return new Response("Email is not configured", { status: 500 });
  }

  const rows = Object.entries(data)
    .filter(([k, v]) => v && k !== "details")
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k.replace("_", " ")}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("");
  const html = `<h2>New quote request</h2><table>${rows}</table>
    <h3>Project details</h3><p style="white-space:pre-wrap">${escapeHtml(data.details)}</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.QUOTE_FROM,
      to: [env.QUOTE_TO],
      reply_to: data.email,
      subject: `Quote request: ${data.name}${data.company ? ` (${data.company})` : ""}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return new Response("Failed to send", { status: 502 });
  }
  return new Response("OK");
}
