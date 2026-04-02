/**
 * GET/PUT /api/auth/profile
 *
 * Get or update the logged-in user's WooCommerce customer profile.
 * Includes billing, shipping addresses.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WC_API_AUTH = process.env.WC_API_AUTH || "";

async function wcFetch(endpoint: string, options: RequestInit = {}) {
  return fetch(`${WP_URL}/wp-json/wc/v3${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Basic ${WC_API_AUTH}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const res = await wcFetch(`/customers/${user.id}`);
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo obtener el perfil" }, { status: 500 });
    }

    const customer = await res.json();

    return NextResponse.json({
      profile: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        avatar_url: customer.avatar_url || "",
        billing: {
          first_name: customer.billing?.first_name || "",
          last_name: customer.billing?.last_name || "",
          email: customer.billing?.email || "",
          phone: customer.billing?.phone || "",
          address_1: customer.billing?.address_1 || "",
          address_2: customer.billing?.address_2 || "",
          city: customer.billing?.city || "",
          state: customer.billing?.state || "",
          postcode: customer.billing?.postcode || "",
          country: customer.billing?.country || "AR",
          company: customer.billing?.company || "",
        },
        shipping: {
          first_name: customer.shipping?.first_name || "",
          last_name: customer.shipping?.last_name || "",
          address_1: customer.shipping?.address_1 || "",
          address_2: customer.shipping?.address_2 || "",
          city: customer.shipping?.city || "",
          state: customer.shipping?.state || "",
          postcode: customer.shipping?.postcode || "",
          country: customer.shipping?.country || "AR",
          company: customer.shipping?.company || "",
        },
        // Additional shipping addresses stored in meta
        extra_addresses: (() => {
          const meta = customer.meta_data?.find(
            (m: { key: string }) => m.key === "sc_extra_shipping_addresses"
          );
          if (meta?.value) {
            try {
              return typeof meta.value === "string"
                ? JSON.parse(meta.value)
                : meta.value;
            } catch {
              return [];
            }
          }
          return [];
        })(),
        dni_cuit: (() => {
          const meta = customer.meta_data?.find(
            (m: { key: string }) => m.key === "billing_dni_cuit"
          );
          return meta?.value || "";
        })(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.first_name) updateData.first_name = body.first_name;
    if (body.last_name) updateData.last_name = body.last_name;

    if (body.billing) {
      updateData.billing = body.billing;
    }

    if (body.shipping) {
      updateData.shipping = body.shipping;
    }

    // Store extra addresses and DNI/CUIT in meta
    const metaData: { key: string; value: string }[] = [];

    if (body.extra_addresses !== undefined) {
      metaData.push({
        key: "sc_extra_shipping_addresses",
        value: JSON.stringify(body.extra_addresses),
      });
    }

    if (body.dni_cuit !== undefined) {
      metaData.push({ key: "billing_dni_cuit", value: body.dni_cuit });
    }

    if (metaData.length > 0) {
      updateData.meta_data = metaData;
    }

    const res = await wcFetch(`/customers/${user.id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Error al actualizar: ${err.slice(0, 200)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
