import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCustomerOrderById } from "@/lib/auth/wc-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const orderId = Number(id);
  if (!orderId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const order = await getCustomerOrderById(user.id, orderId);
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ order });
}
