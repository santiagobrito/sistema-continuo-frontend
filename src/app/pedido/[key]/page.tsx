import type { Metadata } from "next";
import { OrderPanel } from "./OrderPanel";

// Página privada por capability (la order_key): fuera del índice.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Tu pedido — Sistema Continuo",
};

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <OrderPanel orderKey={key} />;
}
