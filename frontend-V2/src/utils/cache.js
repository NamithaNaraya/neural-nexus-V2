const DEFAULT_TTL_MS = 5 * 60 * 1000;

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function readCache(key) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const expiresAt = Number(parsed.expiresAt || 0);
    if (expiresAt && expiresAt < Date.now()) return null;

    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeCache(key, data, ttlMs = DEFAULT_TTL_MS) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      key,
      JSON.stringify({
        data,
        expiresAt: Date.now() + ttlMs,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Ignore quota/serialization errors.
  }
}

export function clearCache(key) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
}
