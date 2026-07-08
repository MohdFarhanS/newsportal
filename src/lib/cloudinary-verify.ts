import "server-only"
import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Harus tetap sinkron dengan EDITORIAL_OPTIONS di src/components/ui/upload-widget.tsx
// dan preset newsportal_avatars/newsportal_covers di Cloudinary dashboard.
const ALLOWED_IMAGE_FORMATS = new Set(["png", "jpg", "jpeg", "webp"])
const MAX_IMAGE_BYTES = 5_000_000

type VerifyResult = { ok: true; secureUrl: string } | { ok: false; reason: string }

/**
 * Re-verifikasi file yang baru di-upload lewat Cloudinary Admin API (server-side,
 * tidak bisa dipalsukan client) sebelum URL-nya dipercaya dan disimpan ke DB.
 * Menutup gap unsigned-upload-preset: widget config (clientAllowedFormats,
 * maxImageFileSize) cuma dipatuhi browser, bisa dilewati dengan POST langsung ke
 * endpoint Cloudinary. `secureUrl` yang dikembalikan berasal dari response Cloudinary
 * sendiri (bukan string yang dikirim client) sehingga client tidak bisa menitipkan
 * public_id yang valid tapi URL palsu.
 */
export async function verifyUploadedImage(publicId: string | undefined): Promise<VerifyResult> {
  if (!publicId) {
    return { ok: false, reason: "Upload tidak terverifikasi. Silakan upload ulang." }
  }

  let resource
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: "image" })
  } catch {
    return { ok: false, reason: "File upload tidak ditemukan atau gagal diverifikasi." }
  }

  if (typeof resource.secure_url !== "string") {
    return { ok: false, reason: "File upload tidak ditemukan atau gagal diverifikasi." }
  }
  if (typeof resource.bytes === "number" && resource.bytes > MAX_IMAGE_BYTES) {
    return { ok: false, reason: "Ukuran file melebihi batas 5MB." }
  }
  if (
    typeof resource.format === "string" &&
    !ALLOWED_IMAGE_FORMATS.has(resource.format.toLowerCase())
  ) {
    return { ok: false, reason: "Format file tidak didukung (hanya PNG/JPG/WEBP)." }
  }

  return { ok: true, secureUrl: resource.secure_url }
}
