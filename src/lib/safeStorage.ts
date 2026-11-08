// Safe localStorage wrapper to prevent mobile Safari / WebViews / incognito from throwing SecurityError
class MemoryStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const memoryStorage = new MemoryStorage();

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__aimplb_storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (hasLocalStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStorage.getItem(key);
    } catch {
      return memoryStorage.getItem(key);
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      memoryStorage.setItem(key, value);
    } catch {
      memoryStorage.setItem(key, value);
    }
  },
  removeItem(key: string): void {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      memoryStorage.removeItem(key);
    } catch {
      memoryStorage.removeItem(key);
    }
  },
};

