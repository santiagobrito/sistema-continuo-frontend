/**
 * WooCommerce customer/order API — server-side only
 */

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

async function wcFetch(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${WC_API_AUTH}`,
      ...options.headers,
    },
  });
  return res;
}

export interface WCCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  billing: Record<string, string>;
  shipping: Record<string, string>;
}

export async function authenticateCustomer(email: string, password: string): Promise<WCCustomer | null> {
  // WooCommerce doesn't have a direct auth endpoint.
  // We authenticate against WordPress REST API using application passwords.
  // For customers, we verify by checking if the email exists and validate via WP.
  const wpRes = await fetch(`${WP_URL}/wp-json/wp/v2/users?search=${encodeURIComponent(email)}&context=edit`, {
    headers: { Authorization: `Basic ${WC_API_AUTH}` },
  });

  if (!wpRes.ok) return null;
  const users = await wpRes.json();
  const user = users.find((u: { email: string }) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  // Try to authenticate with the password via WP application password check
  const authTest = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}` },
  });

  if (!authTest.ok) return null;

  // Get WC customer data
  const customerRes = await wcFetch(`customers?email=${encodeURIComponent(email)}`);
  if (!customerRes.ok) return null;
  const customers = await customerRes.json();

  return customers[0] || null;
}

export async function getCustomerByEmail(email: string): Promise<WCCustomer | null> {
  const res = await wcFetch(`customers?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  const customers = await res.json();
  return customers[0] || null;
}

export async function createCustomer(data: {
  email: string;
  first_name: string;
  last_name: string;
  password?: string;
}): Promise<WCCustomer | null> {
  const res = await wcFetch("customers", {
    method: "POST",
    body: JSON.stringify({
      email: data.email,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.email.split("@")[0] + Math.floor(Math.random() * 1000),
      password: data.password || Math.random().toString(36).slice(-12),
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getCustomerOrders(customerId: number): Promise<unknown[]> {
  const res = await wcFetch(`orders?customer=${customerId}&per_page=20&orderby=date&order=desc`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateCustomer(customerId: number, data: Record<string, unknown>): Promise<WCCustomer | null> {
  const res = await wcFetch(`customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) return null;
  return res.json();
}
