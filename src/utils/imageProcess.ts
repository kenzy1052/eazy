// Shrinks photos at import time. Images are stored as base64 text inside the
// saved design (localStorage), and the Android WebView only allows roughly 5
// million characters there in total — one full-resolution 12MP phone photo is
// 4–6 million on its own. So every image is resized to what a design can
// actually use before it is stored.
//
// The decisions (what to resize, to what, as which format) are pure functions
// so they're unit-tested (scripts/storage.test.ts); only the canvas
// re-encoding at the bottom needs a browser.

/** Longest side kept. 2048 still fills a 1080×1920 story full-bleed at 1:1. */
export const MAX_IMAGE_SIDE = 2048;
export const JPEG_QUALITY = 0.82;
/** An unscaled JPEG/WebP bigger than this (as base64 chars) is worth re-compressing. */
export const REENCODE_ABOVE_CHARS = 600_000;

export type OutputType = 'image/jpeg' | 'image/png' | 'image/webp';

export function mimeOf(dataUrl: string): string | null {
  const m = /^data:([a-z]+\/[a-z0-9.+-]+)[;,]/i.exec(dataUrl);
  return m ? m[1].toLowerCase() : null;
}

/** null = leave the image alone (SVG stays vector, GIF may animate, unknown types we can't re-encode safely). */
export function outputTypeFor(mime: string | null): OutputType | null {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/pjpeg':
      return 'image/jpeg';
    case 'image/png':
      return 'image/png';
    case 'image/webp':
      return 'image/webp';
    default:
      return null;
  }
}

export function fitWithin(width: number, height: number, maxSide: number) {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest <= 0) return { width, height, scaled: false };
  const r = maxSide / longest;
  return { width: Math.max(1, Math.round(width * r)), height: Math.max(1, Math.round(height * r)), scaled: true };
}

export type ProcessPlan =
  | { action: 'keep' }
  | { action: 'reencode'; width: number; height: number; type: OutputType };

export function planImageProcessing(dataUrlLength: number, mime: string | null, width: number, height: number): ProcessPlan {
  const type = outputTypeFor(mime);
  if (!type) return { action: 'keep' };
  const fit = fitWithin(width, height, MAX_IMAGE_SIDE);
  if (fit.scaled) return { action: 'reencode', width: fit.width, height: fit.height, type };
  // Right size already. Re-compressing a PNG wouldn't shrink it (and would cost
  // nothing but time), so only photos-as-JPEG/WebP that are still heavy qualify.
  if (type !== 'image/png' && dataUrlLength > REENCODE_ABOVE_CHARS) return { action: 'reencode', width, height, type };
  return { action: 'keep' };
}

// ---- browser only ---------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image decode failed'));
    img.src = src;
  });
}

/** Returns a smaller data URL when that helps, otherwise the original. Never throws. */
export async function downscaleDataUrl(dataUrl: string): Promise<string> {
  try {
    const mime = mimeOf(dataUrl);
    if (!outputTypeFor(mime)) return dataUrl;
    const img = await loadImage(dataUrl);
    const plan = planImageProcessing(dataUrl.length, mime, img.naturalWidth, img.naturalHeight);
    if (plan.action === 'keep') return dataUrl;

    const canvas = document.createElement('canvas');
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, plan.width, plan.height);
    const out = canvas.toDataURL(plan.type, JPEG_QUALITY);

    if (mimeOf(out) !== plan.type) return dataUrl; // browser couldn't encode that format
    const resized = plan.width !== img.naturalWidth || plan.height !== img.naturalHeight;
    return resized || out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl; // e.g. HEIC the browser can't decode — store it as-is rather than lose the image
  }
}

export function readFileAsOptimizedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => downscaleDataUrl(reader.result as string).then(resolve, reject);
    reader.onerror = () => reject(reader.error ?? new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}
