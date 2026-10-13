// Debounced writer behind the zustand `persist` store, so dragging doesn't
// stringify the whole project dozens of times a second on low-RAM phones.
//
// New in this version: a failed write is no longer silent. If the browser's
// storage quota is hit, the app is told (so it can show a message) instead of
// quietly dropping the user's edits, and there's a one-time warning when
// storage is nearly full.

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageHooks {
  /** A write was rejected (quota). Rate limited — at most once every few seconds. */
  onFull?: () => void;
  /** A write succeeded but the data is getting close to the limit. Once per session. */
  onNearlyFull?: () => void;
}

/** ~80% of the ~5M-character (10MB of UTF-16) localStorage quota in Chromium WebViews. */
export const NEARLY_FULL_CHARS = 4_000_000;

export function isQuotaError(e: unknown): boolean {
  const err = e as { name?: string; code?: number; message?: string } | null;
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    /quota/i.test(err.message ?? '')
  );
}

export function createDebouncedStorage(backing: () => StorageLike, hooks: StorageHooks = {}, delayMs = 400, now: () => number = Date.now) {
  let pendingKey: string | null = null;
  let pendingVal: string | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let warnedNearlyFull = false;
  let lastFullNotice = -Infinity;

  const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (pendingKey === null || pendingVal === null) return;
    const key = pendingKey, val = pendingVal;
    pendingKey = null;
    pendingVal = null;
    try {
      backing().setItem(key, val);
      if (!warnedNearlyFull && val.length > NEARLY_FULL_CHARS) {
        warnedNearlyFull = true;
        hooks.onNearlyFull?.();
      }
    } catch (e) {
      console.warn('Storage write failed', e);
      if (isQuotaError(e) && now() - lastFullNotice > 10_000) {
        lastFullNotice = now();
        hooks.onFull?.();
      }
    }
  };

  return {
    getItem: (name: string) => (pendingKey === name && pendingVal !== null ? pendingVal : backing().getItem(name)),
    setItem: (name: string, value: string) => {
      pendingKey = name;
      pendingVal = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    removeItem: (name: string) => {
      if (pendingKey === name) { pendingKey = null; pendingVal = null; }
      if (timer) { clearTimeout(timer); timer = null; }
      backing().removeItem(name);
    },
    flush,
  };
}
