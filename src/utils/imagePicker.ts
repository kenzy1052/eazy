import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { downscaleDataUrl, readFileAsOptimizedDataUrl } from './imageProcess';

export type ImagePickSource = 'gallery' | 'files' | 'camera';

/**
 * Ensures required permissions on native Android/iOS
 */
export async function ensureImagePermissions(source: ImagePickSource = 'gallery'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true; // Web browsers handle permissions automatically
  }

  try {
    const permStatus = await Camera.checkPermissions();
    if (source === 'camera') {
      if (permStatus.camera !== 'granted') {
        const req = await Camera.requestPermissions({ permissions: ['camera'] });
        return req.camera === 'granted';
      }
      return true;
    } else {
      if (permStatus.photos !== 'granted') {
        const req = await Camera.requestPermissions({ permissions: ['photos'] });
        return req.photos === 'granted' || req.photos === 'limited';
      }
      return true;
    }
  } catch (err) {
    console.warn('Permission request error (continuing anyway):', err);
    return true;
  }
}

/**
 * Pick from native Gallery / Google Photos / Samsung Gallery
 */
export async function pickFromNativeGallery(): Promise<string | null> {
  try {
    await ensureImagePermissions('gallery');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });
    return photo.dataUrl ? await downscaleDataUrl(photo.dataUrl) : null;
  } catch (err: any) {
    // If user cancelled, return null silently
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return null;
    }
    console.warn('Camera.getPhoto error:', err);
    // If native fails, fallback to file input
    return pickFromFileExplorer('image/*');
  }
}

/**
 * Pick with Camera
 */
export async function pickFromCamera(): Promise<string | null> {
  try {
    await ensureImagePermissions('camera');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    return photo.dataUrl ? await downscaleDataUrl(photo.dataUrl) : null;
  } catch (err: any) {
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return null;
    }
    console.warn('Camera error:', err);
    return null;
  }
}

/**
 * Pick from File Explorer (ZArchiver, Google Drive, My Files, Downloads)
 */
export function pickFromFileExplorer(accept: string = 'image/*'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    let resolved = false;

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
        return;
      }

      readFileAsOptimizedDataUrl(file).then(
        (url) => { if (!resolved) { resolved = true; resolve(url); } },
        () => { if (!resolved) { resolved = true; resolve(null); } }
      );
    };

    // Detect cancellation window focus
    const onFocus = () => {
      setTimeout(() => {
        if (!resolved && (!input.files || input.files.length === 0)) {
          resolved = true;
          resolve(null);
        }
        window.removeEventListener('focus', onFocus);
      }, 1000);
    };
    window.addEventListener('focus', onFocus, { once: true });

    document.body.appendChild(input);
    input.click();
    setTimeout(() => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    }, 10000);
  });
}

/**
 * Unified image picker by source
 */
export async function pickImageBySource(source: ImagePickSource): Promise<string | null> {
  if (source === 'gallery') {
    if (Capacitor.isNativePlatform()) {
      return pickFromNativeGallery();
    }
    // Web photo picker
    return pickFromFileExplorer('image/*');
  } else if (source === 'camera') {
    if (Capacitor.isNativePlatform()) {
      return pickFromCamera();
    }
    // Web camera prompt
    return pickFromFileExplorer('image/*');
  } else {
    // 'files' -> Opens ZArchiver, My Files, Downloads, etc.
    return pickFromFileExplorer('image/*,application/octet-stream');
  }
}
