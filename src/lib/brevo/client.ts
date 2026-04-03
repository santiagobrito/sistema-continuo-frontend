/**
 * Brevo (Sendinblue) API client — Sistema Continuo
 *
 * Handles: newsletter subscription, abandoned cart emails, transactional emails.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_BASE = "https://api.brevo.com/v3";
const NEWSLETTER_LIST_ID = parseInt(process.env.BREVO_NEWSLETTER_LIST_ID || "9");
const ABANDONED_CART_LIST_ID = parseInt(process.env.BREVO_ABANDONED_CART_LIST_ID || "10");

async function brevoFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${BREVO_BASE}${endpoint}`, {
    ...options,
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res;
}

/**
 * Subscribe email to newsletter list
 */
export async function subscribeNewsletter(email: string, name?: string) {
  const [firstName, ...rest] = (name || "").split(" ");

  const res = await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName || "",
        LASTNAME: rest.join(" ") || "",
      },
      listIds: [NEWSLETTER_LIST_ID],
      updateEnabled: true,
    }),
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    // "Contact already exist" is fine
    if (err.code !== "duplicate_parameter") {
      throw new Error(err.message || `Brevo error ${res.status}`);
    }
  }

  return { success: true };
}

/**
 * Add contact to abandoned cart list with cart data
 */
export async function trackAbandonedCart(
  email: string,
  name: string,
  phone: string,
  cartItems: { name: string; quantity: number; price: number }[],
  cartTotal: number,
) {
  const [firstName, ...rest] = name.split(" ");

  // Create/update contact in abandoned cart list
  await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName || "",
        LASTNAME: rest.join(" ") || "",
        SMS: phone || "",
        CART_TOTAL: cartTotal,
        CART_ITEMS: cartItems.map((i) => `${i.name} x${i.quantity}`).join(", "),
        CART_DATE: new Date().toISOString(),
      },
      listIds: [ABANDONED_CART_LIST_ID],
      updateEnabled: true,
    }),
  });

  return { success: true };
}

/**
 * Remove from abandoned cart list (when they complete purchase)
 */
export async function markCartRecovered(email: string) {
  try {
    await brevoFetch(`/contacts/lists/${ABANDONED_CART_LIST_ID}/contacts/remove`, {
      method: "POST",
      body: JSON.stringify({ emails: [email] }),
    });
  } catch {
    // Non-critical, ignore
  }
}

/**
 * Send transactional email (order confirmation, etc.)
 */
export async function sendTransactionalEmail(options: {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}) {
  const res = await brevoFetch("/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: options.sender || { name: "Sistema Continuo", email: "ventas@sistemacontinuo.com.ar" },
      to: [{ email: options.to.email, name: options.to.name || "" }],
      subject: options.subject,
      htmlContent: options.htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Email error ${res.status}`);
  }

  return { success: true };
}

/**
 * Send abandoned cart reminder email
 */
export async function sendAbandonedCartEmail(
  email: string,
  name: string,
  cartItems: { name: string; quantity: number; price: number }[],
  cartTotal: number,
) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sistemacontinuo.com.ar";
  const itemsHtml = cartItems
    .map((i) => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.price.toLocaleString("es-AR")}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#013d5a;padding:20px;text-align:center">
        <h1 style="color:white;margin:0;font-size:20px">Sistema Continuo</h1>
      </div>
      <div style="padding:30px 20px">
        <h2 style="color:#013d5a;margin-bottom:10px">Hola ${name.split(" ")[0]}, te olvidaste algo!</h2>
        <p style="color:#666;line-height:1.6">Notamos que dejaste productos en tu carrito. Todavia estan disponibles:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <thead><tr style="background:#f5f5f5"><th style="padding:8px;text-align:left">Producto</th><th style="padding:8px;text-align:center">Cant.</th><th style="padding:8px;text-align:right">Precio</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot><tr><td colspan="2" style="padding:10px 8px;font-weight:bold">Total</td><td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:18px;color:#013d5a">$${cartTotal.toLocaleString("es-AR")}</td></tr></tfoot>
        </table>
        <div style="text-align:center;margin:30px 0">
          <a href="${siteUrl}/carrito" style="background:#013d5a;color:white;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Completar mi compra</a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:30px">
          Enviamos a todo el pais. Hasta 12 cuotas con MercadoPago.<br>
          <a href="https://wa.me/5491130793862" style="color:#013d5a">Dudas? WhatsApp 11 3079-3862</a>
        </p>
      </div>
    </div>
  `;

  return sendTransactionalEmail({
    to: { email, name },
    subject: `${name.split(" ")[0]}, tu carrito te esta esperando`,
    htmlContent: html,
  });
}
