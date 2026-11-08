export interface UniversalStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys: () => Promise<string[]>;
}

/**
 * In-Memory storage implementation for Node.js / Jest test environments
 */
export class MemoryStorage implements UniversalStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, String(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

/**
 * Web LocalStorage implementation with safe quota and exception handling
 */
export class WebLocalStorage implements UniversalStorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // localStorage may be disabled in restricted iframes or incognito modes
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
      }
    } catch {
      // Handle quota exceeded or security restriction
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
    } catch {
      // Ignore
    }
    return [];
  }
}

/**
 * Mobile Native storage implementation utilizing AsyncStorage or memory fallback
 */
export class MobileAsyncStorage implements UniversalStorageAdapter {
  private fallback = new MemoryStorage();
  private nativeStorage: any = null;

  constructor() {
    try {
      // Safe dynamic resolution to avoid bundler crash when native module is absent
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.nativeStorage = require('@react-native-async-storage/async-storage').default;
    } catch {
      this.nativeStorage = null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.nativeStorage?.getItem) {
      try {
        return await this.nativeStorage.getItem(key);
      } catch {
        return this.fallback.getItem(key);
      }
    }
    return this.fallback.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    if (this.nativeStorage?.setItem) {
      try {
        await this.nativeStorage.setItem(key, String(value));
        return;
      } catch {
        return this.fallback.setItem(key, value);
      }
    }
    return this.fallback.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    if (this.nativeStorage?.removeItem) {
      try {
        await this.nativeStorage.removeItem(key);
        return;
      } catch {
        return this.fallback.removeItem(key);
      }
    }
    return this.fallback.removeItem(key);
  }

  async clear(): Promise<void> {
    if (this.nativeStorage?.clear) {
      try {
        await this.nativeStorage.clear();
        return;
      } catch {
        return this.fallback.clear();
      }
    }
    return this.fallback.clear();
  }

  async getAllKeys(): Promise<string[]> {
    if (this.nativeStorage?.getAllKeys) {
      try {
        return await this.nativeStorage.getAllKeys();
      } catch {
        return this.fallback.getAllKeys();
      }
    }
    return this.fallback.getAllKeys();
  }
}

/**
 * Safely resolves runtime platform without requiring react-native at root module load time.
 * In Jest/Node, returns 'node' without touching react-native.
 * In Web browser, returns 'web' via window/localStorage detection.
 * In React Native native, safely resolves Platform.OS dynamically.
 */
function getRuntimePlatform(): string {
  if (
    typeof process !== 'undefined' &&
    (process.env?.JEST_WORKER_ID !== undefined || process.env?.NODE_ENV === 'test')
  ) {
    return 'node';
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return 'web';
  }

  try {
    const RN = (require as any)('react-native');
    if (RN?.Platform?.OS) {
      return RN.Platform.OS;
    }
  } catch {
    // Silently fall back
  }

  return 'unknown';
}

/**
 * Universal Storage Factory: Selects appropriate adapter based on current runtime
 */
export function createUniversalStorage(): UniversalStorageAdapter {
  // 1. Jest or Node environment
  if (
    typeof process !== 'undefined' &&
    (process.env?.JEST_WORKER_ID !== undefined || process.env?.NODE_ENV === 'test')
  ) {
    return new MemoryStorage();
  }

  const platform = getRuntimePlatform();

  // 2. Web browser
  if (platform === 'web' || (typeof window !== 'undefined' && typeof localStorage !== 'undefined')) {
    return new WebLocalStorage();
  }

  // 3. React Native Native (Android / iOS)
  if (platform === 'android' || platform === 'ios') {
    return new MobileAsyncStorage();
  }

  return new MemoryStorage();
}

export const universalStorage = createUniversalStorage();
export default universalStorage;
