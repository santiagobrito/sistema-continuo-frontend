// Compresión de fotos de reseña en el cliente. Compartido entre el formulario de
// reseña (desktop/móvil) y la página de subida por handoff QR.

export const MAX_PHOTOS = 3;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Comprime/redimensiona la foto a ~maxDim px lado mayor, JPEG. Baja fotos de
// celular de varios MB a ~200-400KB. Devuelve null si el navegador no puede
// decodificar el formato (p.ej. HEIC en Chrome desktop); en Safari iOS el HEIC sí
// decodifica, que es el grueso del tráfico móvil.
export async function compressPhoto(
  file: File,
  maxDim = 1400,
  quality = 0.82,
): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return null;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return null;
  }
}
