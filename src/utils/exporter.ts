import { toJpeg, toPng } from 'html-to-image';

export async function renderToJpeg(node: HTMLElement, width: number, height: number): Promise<string> {
  // Render at 1:1 device pixels so the export matches the spec dimensions exactly.
  return toJpeg(node, {
    quality: 0.95,
    width,
    height,
    pixelRatio: 1,
    backgroundColor: '#000000',
    cacheBust: true,
    style: { transform: 'none', margin: '0' },
  });
}

/** Transparent-background PNG export — used for downloading a single layer
 * (text/shape/image) rather than the whole poster, so it stays cut-out-able. */
export async function renderToPng(node: HTMLElement, width: number, height: number): Promise<string> {
  return toPng(node, {
    quality: 1,
    width,
    height,
    pixelRatio: 2,
    cacheBust: true,
    style: { transform: 'none', margin: '0' },
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function shareImage(dataUrl: string, filename: string, title: string): Promise<'shared' | 'unsupported' | 'cancelled'> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], filename, { type: 'image/jpeg' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  return 'unsupported';
}
