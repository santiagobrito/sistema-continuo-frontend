import { NextResponse } from "next/server";

const WP_URL = process.env.WP_URL || "";

export async function POST(request: Request) {
  const { product_id, email } = await request.json();

  if (!product_id || !email?.includes("@")) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const res = await fetch(`${WP_URL}/wp-json/sistema-continuo/v1/back-in-stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id, email }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
