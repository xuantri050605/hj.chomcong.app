import { universalStorage, UniversalStorageAdapter } from './universalStorage';

export interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  fullName?: string;
  user_metadata?: UserMetadata;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Session {
  access_token: string;
  accessToken: string;
  refresh_token: string;
  refreshToken: string;
  expires_at: number;
  expiresAt: number;
  user: User;
  [key: string]: any;
}

export interface AuthChangeEvent {
  (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: Session | null): void;
}

export interface SupabaseAuthClient {
  signUp: (params: {
    email: string;
    password: string;
    options?: { data?: Record<string, any> };
  }) => Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }>;
  signInWithPassword: (params: {
    email: string;
    password: string;
  }) => Promise<{ data: { user: User | null; session: Session | null }; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  getSession: () => Promise<{ data: { session: Session | null }; error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ data: any; error: Error | null }>;
  onAuthStateChange: (callback: AuthChangeEvent) => { data: { subscription: { unsubscribe: () => void } } };
}

export interface SupabaseClient {
  auth: SupabaseAuthClient;
  from: (tableName: string) => any;
}

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byzsyyzothoizcvffsbt.supabase.co';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5enN5eXpvdGhvaXpjdmZmc2J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwNzAwODEsImV4cCI6MjEwOTY0NjA4MX0.PDbVSqj9NBulPIJ2D-kos_w_FmrtzU8q1lR_ep7ec7A';

const isTestEnv =
  process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

export const isSupabaseConfigured = Boolean(
  !isTestEnv &&
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    supabaseAnonKey.length > 20
);

const SESSION_STORAGE_KEY = 'sb-auth-token';
const USERS_REGISTRY_KEY = 'sb-local-users-registry';

/**
 * Genuine Local Fallback Client maintaining real state in universalStorage
 * Used when Supabase URL/Key is not configured or in offline/demo mode.
 */
export class LocalFallbackSupabaseClient implements SupabaseClient {
  private storage: UniversalStorageAdapter;
  private authListeners = new Set<AuthChangeEvent>();
  private currentSession: Session | null = null;
  private tables = new Map<string, Map<string, any>>();

  constructor(storage: UniversalStorageAdapter = universalStorage) {
    this.storage = storage;
    this.tables.set('profiles', new Map());
    this.tables.set('salary_configs', new Map());
    this.tables.set('attendance_records', new Map());
    this.tables.set('payroll_history', new Map());
    this.tables.set('sync_events', new Map());
  }

  private async loadUsersRegistry(): Promise<Map<string, { password: string; user: User }>> {
    const raw = await this.storage.getItem(USERS_REGISTRY_KEY);
    const map = new Map<string, { password: string; user: User }>();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        for (const [email, entry] of Object.entries(parsed)) {
          map.set(email.toLowerCase(), entry as { password: string; user: User });
        }
      } catch {
        // Corrupted registry
      }
    }
    return map;
  }

  private async saveUsersRegistry(registry: Map<string, { password: string; user: User }>): Promise<void> {
    const obj: Record<string, any> = {};
    for (const [k, v] of registry.entries()) {
      obj[k] = v;
    }
    await this.storage.setItem(USERS_REGISTRY_KEY, JSON.stringify(obj));
  }

  private notifyListeners(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: Session | null) {
    this.authListeners.forEach((listener) => {
      try {
        listener(event, session);
      } catch {
        // Safe dispatch
      }
    });
  }

  public auth: SupabaseAuthClient = {
    signUp: async ({ email, password, options }) => {
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return { data: { user: null, session: null }, error: new Error('Invalid email format') };
      }
      if (!password || password.length < 6) {
        return { data: { user: null, session: null }, error: new Error('Password should be at least 6 characters') };
      }

      const registry = await this.loadUsersRegistry();
      if (registry.has(trimmedEmail)) {
        return { data: { user: null, session: null }, error: new Error('User already registered') };
      }

      const fullName = options?.data?.full_name?.trim() || trimmedEmail.split('@')[0];
      const userId = 'usr_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      const user: User = {
        id: userId,
        email: trimmedEmail,
        fullName,
        user_metadata: {
          full_name: fullName,
          ...(options?.data || {}),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      registry.set(trimmedEmail, { password, user });
      await this.saveUsersRegistry(registry);

      const expiresAt = Date.now() + 30 * 24 * 3600 * 1000; // 30 days
      const token = 'jwt_' + Buffer_btoa(userId + ':' + Date.now());
      const session: Session = {
        access_token: token,
        accessToken: token,
        refresh_token: 'refresh_' + token,
        refreshToken: 'refresh_' + token,
        expires_at: Math.floor(expiresAt / 1000),
        expiresAt,
        user,
      };

      this.currentSession = session;
      await this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      this.notifyListeners('SIGNED_IN', session);

      return { data: { user, session }, error: null };
    },

    signInWithPassword: async ({ email, password }) => {
      const trimmedEmail = (email || '').trim().toLowerCase();
      if (!trimmedEmail || !password) {
        return { data: { user: null, session: null }, error: new Error('Email and password are required') };
      }

      const registry = await this.loadUsersRegistry();
      const existing = registry.get(trimmedEmail);
      if (!existing || existing.password !== password) {
        return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
      }

      const expiresAt = Date.now() + 30 * 24 * 3600 * 1000;
      const token = 'jwt_' + Buffer_btoa(existing.user.id + ':' + Date.now());
      const session: Session = {
        access_token: token,
        accessToken: token,
        refresh_token: 'refresh_' + token,
        refreshToken: 'refresh_' + token,
        expires_at: Math.floor(expiresAt / 1000),
        expiresAt,
        user: existing.user,
      };

      this.currentSession = session;
      await this.storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      this.notifyListeners('SIGNED_IN', session);

      return { data: { user: existing.user, session }, error: null };
    },

    signOut: async () => {
      this.currentSession = null;
      await this.storage.removeItem(SESSION_STORAGE_KEY);
      this.notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => {
      const raw = await this.storage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        this.currentSession = null;
        return { data: { session: null }, error: null };
      }

      try {
        const parsed: Session = JSON.parse(raw);
        const expiresAt = parsed.expiresAt || (parsed.expires_at ? parsed.expires_at * 1000 : 0);
        if (expiresAt && expiresAt < Date.now()) {
          this.currentSession = null;
          await this.storage.removeItem(SESSION_STORAGE_KEY);
          return { data: { session: null }, error: null };
        }
        // Normalize token properties
        parsed.accessToken = parsed.accessToken || parsed.access_token;
        parsed.access_token = parsed.access_token || parsed.accessToken;
        parsed.refreshToken = parsed.refreshToken || parsed.refresh_token;
        parsed.refresh_token = parsed.refresh_token || parsed.refreshToken;
        parsed.expiresAt = expiresAt;
        parsed.expires_at = Math.floor(expiresAt / 1000);
        if (parsed.user && !parsed.user.fullName) {
          parsed.user.fullName = parsed.user.user_metadata?.full_name || parsed.user.email?.split('@')[0] || '';
        }

        this.currentSession = parsed;
        return { data: { session: parsed }, error: null };
      } catch {
        this.currentSession = null;
        await this.storage.removeItem(SESSION_STORAGE_KEY);
        return { data: { session: null }, error: null };
      }
    },

    resetPasswordForEmail: async (email: string) => {
      const trimmedEmail = (email || '').trim().toLowerCase();
      const registry = await this.loadUsersRegistry();
      if (!registry.has(trimmedEmail)) {
        return { data: null, error: new Error('Không tìm thấy tài khoản với email này.') };
      }
      return { data: {}, error: null };
    },

    onAuthStateChange: (callback: AuthChangeEvent) => {
      this.authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners.delete(callback);
            },
          },
        },
      };
    },
  };

  public from(tableName: string) {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    const table = this.tables.get(tableName)!;
    const currentUserId = this.currentSession?.user?.id;

    const buildQuery = (filters: Array<{ column: string; value: any }> = []) => {
      const execute = () => {
        let rows = Array.from(table.values());
        for (const f of filters) {
          rows = rows.filter((r) => r[f.column] === f.value);
        }
        if (tableName !== 'profiles' && currentUserId) {
          rows = rows.filter((r) => !r.user_id || r.user_id === currentUserId);
        }
        return rows;
      };

      const queryObj: any = {
        eq: (column: string, value: any) => buildQuery([...filters, { column, value }]),
        maybeSingle: async () => {
          const rows = execute();
          return { data: rows.length > 0 ? rows[0] : null, error: null };
        },
        single: async () => {
          const rows = execute();
          if (rows.length === 0) return { data: null, error: new Error('Row not found') };
          return { data: rows[0], error: null };
        },
        then: (resolve: any, reject: any) => {
          const rows = execute();
          return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve, reject);
        },
      };

      return queryObj;
    };

    return {
      select: (_columns: string = '*', _options?: any) => buildQuery(),
      insert: async (records: any | any[]) => {
        const recordList = Array.isArray(records) ? records : [records];
        for (const record of recordList) {
          if (tableName !== 'profiles' && record.user_id && currentUserId && record.user_id !== currentUserId) {
            return { data: null, error: new Error('RLS policy violation: unauthorized user_id') };
          }
          const id = record.id || 'rec_' + Math.random().toString(36).substring(2, 9);
          table.set(id, { ...record, id });
        }
        return { data: recordList, error: null };
      },
      upsert: async (records: any | any[], options?: { onConflict?: string }) => {
        const recordList = Array.isArray(records) ? records : [records];
        for (const record of recordList) {
          let key = record.id;
          if (!key) {
            if (options?.onConflict === 'user_id,date' && record.user_id && record.date) {
              key = `${record.user_id}_${record.date}`;
            } else if (options?.onConflict === 'user_id,month' && record.user_id && record.month) {
              key = `${record.user_id}_${record.month}`;
            } else if (options?.onConflict === 'user_id,fingerprint' && record.user_id && record.fingerprint) {
              key = `${record.user_id}_${record.fingerprint}`;
            } else if (record.user_id) {
              key = `${record.user_id}`;
            } else {
              key = 'rec_' + Math.random().toString(36).substring(2, 9);
            }
          }
          table.set(key, { ...record, id: record.id || key });
        }
        return { data: Array.isArray(records) ? recordList : recordList[0], error: null };
      },
      delete: () => ({
        eq: async (column: string, value: any) => {
          let count = 0;
          for (const [k, item] of table.entries()) {
            if (item[column] === value) {
              table.delete(k);
              count++;
            }
          }
          return { data: { count }, error: null };
        },
      }),
    };
  }
}

function Buffer_btoa(input: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(input);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input).toString('base64');
  }
  return input;
}

let activeClientInstance: SupabaseClient | null = null;

/**
 * Returns the Supabase client instance.
 * If live credentials and @supabase/supabase-js are present, initializes live client.
 * Otherwise, gracefully provides the LocalFallbackSupabaseClient.
 */
export function getSupabaseClient(): SupabaseClient {
  if (activeClientInstance) {
    return activeClientInstance;
  }

  if (isSupabaseConfigured) {
    try {
      // Dynamic import to avoid crash when @supabase/supabase-js is not installed
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createClient } = require('@supabase/supabase-js');
      if (typeof createClient === 'function') {
        const liveClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            storage: universalStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: typeof window !== 'undefined' && typeof window.location !== 'undefined',
          },
        });
        activeClientInstance = liveClient as SupabaseClient;
        return activeClientInstance;
      }
    } catch {
      // Fallback
    }
  }

  activeClientInstance = new LocalFallbackSupabaseClient(universalStorage);
  return activeClientInstance;
}

export default getSupabaseClient;
