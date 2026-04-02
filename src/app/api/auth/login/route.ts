import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { getCustomerByEmail } from "@/lib/auth/wc-api";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  // For now: verify customer exists in WC (password auth requires WP user, which most customers don't have)
  // In production: implement proper password validation or magic link
  const customer = await getCustomerByEmail(email);

  if (!customer) {
    return NextResponse.json({ error: "No encontramos una cuenta con ese email" }, { status: 401 });
  }

  await createSession({
    id: customer.id,
    email: customer.email,
    name: `${customer.first_name} ${customer.last_name}`.trim() || customer.email,
    role: customer.role || "customer",
  });

  return NextResponse.json({
    user: {
      id: customer.id,
      email: customer.email,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
    },
  });
}
