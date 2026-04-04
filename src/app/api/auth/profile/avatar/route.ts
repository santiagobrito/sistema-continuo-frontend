/**
 * POST /api/auth/profile/avatar
 *
 * Upload profile photo. Stores in WP media library.
 * Returns the URL to store in customer meta.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "";
const WP_APP_PASSWORD = process.env.WC_API_AUTH || "";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se recibio archivo" }, { status: 400 });
    }

    // Validate file
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "La imagen no puede superar 2MB" }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Solo se aceptan JPG, PNG o WebP" }, { status: 400 });
    }

    // Upload to WP media library
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `avatar-${user.id}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const wpRes = await fetch(`${WP_URL}/wp-json/wp/v2/media`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${WP_APP_PASSWORD}`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": file.type,
      },
      body: buffer,
    });

    if (!wpRes.ok) {
      return NextResponse.json({ error: "Error al subir imagen" }, { status: 500 });
    }

    const media = await wpRes.json();
    const url = media.source_url as string;

    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Error al procesar imagen" }, { status: 500 });
  }
}
