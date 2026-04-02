import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth/session";
import { createCustomer, getCustomerByEmail } from "@/lib/auth/wc-api";

export async function POST(request: NextRequest) {
  const { email, first_name, last_name, password } = await request.json();

  if (!email || !first_name) {
    return NextResponse.json({ error: "Email y nombre son requeridos" }, { status: 400 });
  }

  // Check if already exists
  const existing = await getCustomerByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email. Inicia sesion." }, { status: 409 });
  }

  const customer = await createCustomer({ email, first_name, last_name, password });
  if (!customer) {
    return NextResponse.json({ error: "Error al crear la cuenta" }, { status: 500 });
  }

  await createSession({
    id: customer.id,
    email: customer.email,
    name: `${customer.first_name} ${customer.last_name}`.trim(),
    role: "customer",
  });

  return NextResponse.json({
    user: {
      id: customer.id,
      email: customer.email,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
    },
  });
}
