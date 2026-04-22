/**
 * Brevo (Sendinblue) API client — Sistema Continuo
 *
 * Marketing only: newsletter list, abandoned cart list, birthday list, contact
 * attribute sync. Transactional emails se rutean por Resend en el plugin WP
 * (pre_wp_mail filter) — no dispares emails transaccionales desde acá.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY || "";
const BREVO_BASE = "https://api.brevo.com/v3";
const NEWSLETTER_LIST_ID = parseInt(process.env.BREVO_NEWSLETTER_LIST_ID || "9");
const ABANDONED_CART_LIST_ID = parseInt(process.env.BREVO_ABANDONED_CART_LIST_ID || "10");
const BIRTHDAY_LIST_ID = parseInt(process.env.BREVO_BIRTHDAY_LIST_ID || "11");

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
        NOMBRE: firstName || "",
        APELLIDOS: rest.join(" ") || "",
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
  cartUrl?: string,
) {
  const [firstName, ...rest] = name.split(" ");

  // Create/update contact in abandoned cart list
  await brevoFetch("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email,
      attributes: {
        NOMBRE: firstName || "",
        APELLIDOS: rest.join(" ") || "",
        SMS: phone || "",
        CART_TOTAL: cartTotal,
        CART_ITEMS: cartItems.map((i) => `${i.name} x${i.quantity}`).join(", "),
        CART_DAT: new Date().toISOString(),
        ...(cartUrl ? { CART_URL: cartUrl } : {}),
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
 * Update contact attributes in Brevo (syncs profile changes)
 * Also manages birthday list: adds to list 11 if birthday set, removes if cleared.
 */
export async function updateBrevoContact(
  email: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthday?: string; // YYYY-MM-DD or empty
  },
) {
  const attributes: Record<string, string | number> = {};
  if (data.firstName !== undefined) attributes.NOMBRE = data.firstName;
  if (data.lastName !== undefined) attributes.APELLIDOS = data.lastName;
  if (data.phone !== undefined) attributes.SMS = data.phone;
  if (data.birthday !== undefined) attributes.BIRTHDAY = data.birthday;

  const listIds: number[] = [];
  const unlinkListIds: number[] = [];

  if (data.birthday) {
    listIds.push(BIRTHDAY_LIST_ID);
  } else if (data.birthday === "") {
    unlinkListIds.push(BIRTHDAY_LIST_ID);
  }

  try {
    await brevoFetch(`/contacts/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify({
        attributes,
        ...(listIds.length > 0 ? { listIds } : {}),
        ...(unlinkListIds.length > 0 ? { unlinkListIds } : {}),
      }),
    });
  } catch {
    // Non-critical — don't break profile save
  }
}

