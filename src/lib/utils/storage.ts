/**
 * safeStorage — wrapper sobre localStorage/sessionStorage con tolerancia a:
 *   - Safari private mode (lanzaría QuotaExceededError aún en lecturas)
 *   - Cookies disabled / storage disabled por user / por iframe sandbox
 *   - Quota llena (escrituras pueden fallar)
 *   - SSR (no hay window)
 *
 * Uso: `safeStorage.local.get<MyType>(key)` y `safeStorage.local.set(key, val)`.
 * Devuelve `null` en lectura fallida, `false` en escritura fallida — nunca
 * lanza.
 */

type StorageType = "localStorage" | "sessionStorage";

function getStore(type: StorageType): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window[type];
  } catch {
    return null;
  }
}

function makeApi(type: StorageType) {
  return {
    get<T = unknown>(key: string): T | null {
      const store = getStore(type);
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        if (raw === null) return null;
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as unknown as T;
        }
      } catch {
        return null;
      }
    },
    set(key: string, value: unknown): boolean {
      const store = getStore(type);
      if (!store) return false;
      try {
        const raw = typeof value === "string" ? value : JSON.stringify(value);
        store.setItem(key, raw);
        return true;
      } catch {
        return false;
      }
    },
    remove(key: string): boolean {
      const store = getStore(type);
      if (!store) return false;
      try {
        store.removeItem(key);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const safeStorage = {
  local: makeApi("localStorage"),
  session: makeApi("sessionStorage"),
};
