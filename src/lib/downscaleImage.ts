/**
 * Shrink an oversized image in the browser before it is uploaded.
 *
 * Phone cameras and press kits produce 4–8MB JPEGs that get rendered into a
 * 140px banner strip or a 64px avatar, so every viewer downloads two orders of
 * magnitude more data than the layout can show. Resizing here — rather than on
 * the way out of the blob store — means the large original is never stored or
 * paid for in the first place.
 *
 * Always returns a usable File: if anything about the resize fails, or the
 * result would be no smaller, the original is passed through untouched.
 */

/** Longest edge, in pixels, after downscaling. Comfortably above the largest
 *  surface we render (a full-width banner on a 3x phone screen). */
const MAX_DIMENSION = 1600;

/** Files at or below this are left alone even if they exceed MAX_DIMENSION —
 *  re-encoding them would cost quality for no meaningful saving. */
const SKIP_BELOW_BYTES = 400 * 1024;

const JPEG_QUALITY = 0.85;

export interface DownscaleResult {
  file: File;
  /** Bytes of the original, for reporting the saving to the user. */
  originalSize: number;
  /** True when the returned file is a re-encoded, smaller version. */
  resized: boolean;
}

export async function downscaleImage(
  file: File,
  maxDimension: number = MAX_DIMENSION
): Promise<DownscaleResult> {
  const unchanged: DownscaleResult = { file, originalSize: file.size, resized: false };

  // Only raster images. GIFs are skipped because drawing one to a canvas keeps
  // just the first frame, silently destroying an animation.
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return unchanged;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return unchanged;
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDimension / Math.max(width, height));

    // Already small in both senses — nothing worth doing.
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return unchanged;

    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return unchanged;

    // JPEG has no alpha channel, so a transparent source would otherwise
    // composite onto black. White matches the surfaces these images sit on.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return unchanged;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return {
      file: new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }),
      originalSize: file.size,
      resized: true,
    };
  } catch {
    return unchanged;
  } finally {
    bitmap.close();
  }
}

/** "4.6MB" / "312KB" — for upload status messages. */
export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.round(bytes / 1024)}KB`;
}
