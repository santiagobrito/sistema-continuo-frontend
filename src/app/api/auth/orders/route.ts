import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCustomerOrders } from "@/lib/auth/wc-api";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ orders: [] }, { status: 401 });
  }

  const orders = await getCustomerOrders(user.id);
  return NextResponse.json({ orders });
}
