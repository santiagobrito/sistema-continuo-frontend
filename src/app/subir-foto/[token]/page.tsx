import type { Metadata } from "next";
import { PhotoUpload } from "./PhotoUpload";

// Página de utilidad (handoff QR): no debe indexarse.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Subir foto de tu reseña",
};

export default async function SubirFotoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PhotoUpload token={token} />;
}
