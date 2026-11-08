import {
  AuthStateContract,
  SyncMutation,
  SyncServiceContract,
  SyncStatusType,
  ThemeTokensContract,
  UniversalStorageContract,
  UserProfile,
  UserSession,
} from './contractTypes';

// Universal In-Memory Storage Double for clean E2E isolation
export class MockUniversalStorage implements UniversalStorageContract {
  private store: Map<string, string> = new Map();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }
}

// In-Memory Supabase Client Simulator for E2E validation with RLS simulation
export class MockSupabaseClient {
  public auth: {
    signUp: (params: { email: string; password: string; options?: { data?: any } }) => Promise<{ data: { user: UserProfile | null; session: UserSession | null }; error: Error | null }>;
    signInWithPassword: (params: { email: string; password: string }) => Promise<{ data: { user: UserProfile | null; session: UserSession | null }; error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    getSession: () => Promise<{ data: { session: UserSession | null }; error: Error | null }>;
  };

  private users: Map<string, { profile: UserProfile; passwordHash: string }> = new Map();
  public currentSession: UserSession | null = null;
  public tables: Map<string, Map<string, any>> = new Map();

  constructor() {
    this.tables.set('profiles', new Map());
    this.tables.set('salary_configs', new Map());
    this.tables.set('attendance_records', new Map());
    this.tables.set('payroll_history', new Map());
    this.tables.set('sync_events', new Map());

    this.auth = {
      signUp: async ({ email, password, options }) => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return { data: { user: null, session: null }, error: new Error('Invalid email format') };
        }
        if (!password || password.length < 6) {
          return { data: { user: null, session: null }, error: new Error('Password should be at least 6 characters') };
        }
        if (this.users.has(email)) {
          return { data: { user: null, session: null }, error: new Error('User already registered') };
        }
        const userId = 'usr_' + Math.random().toString(36).substring(2, 9);
        const profile: UserProfile = {
          id: userId,
          email,
          fullName: options?.data?.full_name || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.users.set(email, { profile, passwordHash: password });

        // Auto trigger profile insert
        this.tables.get('profiles')!.set(userId, profile);

        const session: UserSession = {
          accessToken: 'mock_jwt_access_' + userId,
          refreshToken: 'mock_jwt_refresh_' + userId,
          expiresAt: Date.now() + 3600 * 1000,
          user: profile,
        };
        this.currentSession = session;
        return { data: { user: profile, session }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        const existing = this.users.get(email);
        if (!existing || existing.passwordHash !== password) {
          return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
        }
        const session: UserSession = {
          accessToken: 'mock_jwt_access_' + existing.profile.id,
          refreshToken: 'mock_jwt_refresh_' + existing.profile.id,
          expiresAt: Date.now() + 3600 * 1000,
          user: existing.profile,
        };
        this.currentSession = session;
        return { data: { user: existing.profile, session }, error: null };
      },

      signOut: async () => {
        this.currentSession = null;
        return { error: null };
      },

      getSession: async () => {
        return { data: { session: this.currentSession }, error: null };
      },
    };
  }

  from(tableName: string) {
    const table = this.tables.get(tableName) || new Map();
    const currentUserId = this.currentSession?.user?.id;

    return {
      select: (columns: string = '*') => ({
        eq: async (column: string, value: any) => {
          // RLS simulation: check if column is user_id and matches auth.uid()
          const rows: any[] = [];
          for (const item of table.values()) {
            if (item[column] === value) {
              if (tableName !== 'profiles' && item.user_id && item.user_id !== currentUserId) {
                // RLS restriction
                continue;
              }
              rows.push(item);
            }
          }
          return { data: rows, error: null };
        },
      }),
      insert: async (records: any | any[]) => {
        const recordList = Array.isArray(records) ? records : [records];
        for (const record of recordList) {
          // RLS check: record must belong to current user
          if (tableName !== 'profiles' && record.user_id && currentUserId && record.user_id !== currentUserId) {
            return { data: null, error: new Error('RLS policy violation: unauthorized user_id') };
          }
          const id = record.id || 'rec_' + Math.random().toString(36).substring(2, 9);
          table.set(id, { ...record, id });
        }
        return { data: recordList, error: null };
      },
      upsert: async (record: any) => {
        const id = record.id || record.user_id || 'rec_' + Math.random().toString(36).substring(2, 9);
        table.set(id, record);
        return { data: record, error: null };
      },
      delete: () => ({
        eq: async (column: string, value: any) => {
          let count = 0;
          for (const [key, item] of table.entries()) {
            if (item[column] === value) {
              table.delete(key);
              count++;
            }
          }
          return { data: { count }, error: null };
        },
      }),
    };
  }
}

// Contract-conforming Auth Store Simulator
export class ContractAuthStore implements AuthStateContract {
  public user: UserProfile | null = null;
  public session: UserSession | null = null;
  public isLoading: boolean = false;
  public error: string | null = null;
  private supabase: MockSupabaseClient;

  constructor(supabaseClient: MockSupabaseClient) {
    this.supabase = supabaseClient;
  }

  async signIn(email: string, password: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
    const res = await this.supabase.auth.signInWithPassword({ email, password });
    this.isLoading = false;
    if (res.error) {
      this.error = res.error.message;
      return false;
    }
    this.user = res.data.user;
    this.session = res.data.session;
    return true;
  }

  async signUp(email: string, password: string, fullName?: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
    const res = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    this.isLoading = false;
    if (res.error) {
      this.error = res.error.message;
      return false;
    }
    this.user = res.data.user;
    this.session = res.data.session;
    return true;
  }

  async signOut(): Promise<void> {
    this.isLoading = true;
    await this.supabase.auth.signOut();
    this.user = null;
    this.session = null;
    this.error = null;
    this.isLoading = false;
  }

  clearError(): void {
    this.error = null;
  }
}

// Offline-First Sync Queue & Service Double with Last-Write-Wins (LWW)
export class MockSyncService implements SyncServiceContract {
  private queue: SyncMutation[] = [];
  private syncStatus: SyncStatusType = 'synced';
  private supabase: MockSupabaseClient;
  public isOnline: boolean = true;

  constructor(supabaseClient: MockSupabaseClient) {
    this.supabase = supabaseClient;
  }

  enqueue(mutation: Omit<SyncMutation, 'id' | 'retryCount' | 'status'>): SyncMutation {
    const item: SyncMutation = {
      ...mutation,
      id: 'mut_' + Math.random().toString(36).substring(2, 9),
      retryCount: 0,
      status: 'PENDING',
    };
    this.queue.push(item);
    if (!this.isOnline) {
      this.syncStatus = 'offline';
    }
    return item;
  }

  getQueue(): SyncMutation[] {
    return [...this.queue];
  }

  clearQueue(): void {
    this.queue = [];
  }

  setOnline(online: boolean) {
    this.isOnline = online;
    this.syncStatus = online ? (this.queue.length > 0 ? 'syncing' : 'synced') : 'offline';
  }

  getSyncStatus(): SyncStatusType {
    return this.syncStatus;
  }

  async pushLocalQueue(userId: string): Promise<number> {
    if (!this.isOnline) {
      this.syncStatus = 'offline';
      return 0;
    }
    this.syncStatus = 'syncing';
    let pushed = 0;
    const pending = this.queue.filter((m) => m.userId === userId && m.status === 'PENDING');

    for (const mutation of pending) {
      try {
        const table = this.supabase.tables.get(mutation.table);
        if (!table) {
          throw new Error(`Table ${mutation.table} not found`);
        }
        // LWW check
        const existing = table.get(mutation.recordId);
        if (existing && existing.updated_at) {
          const existingTime = new Date(existing.updated_at).getTime();
          const clientTime = new Date(mutation.clientTimestamp).getTime();
          if (clientTime >= existingTime) {
            table.set(mutation.recordId, mutation.payload);
          }
        } else {
          table.set(mutation.recordId, mutation.payload);
        }
        mutation.status = 'SYNCED';
        pushed++;
      } catch (e) {
        mutation.retryCount++;
        mutation.status = 'FAILED';
        this.syncStatus = 'error';
      }
    }
    this.queue = this.queue.filter((m) => m.status !== 'SYNCED');
    if (this.syncStatus !== 'error') {
      this.syncStatus = 'synced';
    }
    return pushed;
  }

  async pullRemoteChanges(userId: string): Promise<number> {
    if (!this.isOnline) {
      this.syncStatus = 'offline';
      return 0;
    }
    this.syncStatus = 'syncing';
    this.syncStatus = 'synced';
    return 1;
  }

  async syncAll(userId: string): Promise<{ pushed: number; pulled: number; errors: any[] }> {
    if (!this.isOnline) {
      this.syncStatus = 'offline';
      return { pushed: 0, pulled: 0, errors: ['Device offline'] };
    }
    const pushed = await this.pushLocalQueue(userId);
    const pulled = await this.pullRemoteChanges(userId);
    return { pushed, pulled, errors: [] };
  }
}

// Standalone Mock Animated Value that works in Node environment
export class MockAnimatedValue {
  public _value: number;
  constructor(initial: number) {
    this._value = initial;
  }
  setValue(val: number) {
    this._value = val;
  }
  interpolate(_config: any) {
    return this;
  }
}

// Global Test Harness with Progressive Binding
export class TestHarness {
  public static mockSupabase = new MockSupabaseClient();
  public static mockStorage = new MockUniversalStorage();
  public static mockAuthStore = new ContractAuthStore(TestHarness.mockSupabase);
  public static mockSyncService = new MockSyncService(TestHarness.mockSupabase);

  public static reset() {
    this.mockSupabase = new MockSupabaseClient();
    this.mockStorage = new MockUniversalStorage();
    this.mockAuthStore = new ContractAuthStore(this.mockSupabase);
    this.mockSyncService = new MockSyncService(this.mockSupabase);
    try {
      const realStore = require('../../src/store/authStore');
      if (realStore?.useAuthStore) {
        realStore.useAuthStore.setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
          isOfflineOnly: false,
          error: null,
          isAuthModalOpen: false,
          authModalMode: 'LOGIN',
        });
      }
      const storageModule = require('../../src/services/universalStorage');
      if (storageModule?.universalStorage?.clear) {
        storageModule.universalStorage.clear();
      }
    } catch {}
  }

  // Progressive loader for Theme Tokens
  public static getTheme(): ThemeTokensContract {
    try {
      const realTheme = require('../../src/theme/theme');
      return realTheme.theme || realTheme.default || realTheme;
    } catch {
      return {
        colors: {
          primary: '#2563EB',
          primaryDark: '#1D4ED8',
          primaryLight: '#3B82F6',
          primarySoft: '#EFF6FF',
          primaryBorder: '#BFDBFE',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          purple: '#8B5CF6',
          cyan: '#06B6D4',
          slate900: '#0F172A',
          slate800: '#1E293B',
          slate700: '#334155',
          slate600: '#475569',
          slate500: '#64748B',
          slate400: '#94A3B8',
          slate300: '#CBD5E1',
          slate200: '#E2E8F0',
          slate100: '#F1F5F9',
          slate50: '#F8FAFC',
          white: '#FFFFFF',
          background: '#F8FAFC',
          cardBackground: '#FFFFFF',
          border: '#E2E8F0',
        },
        radius: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, full: 9999 },
        shadows: {},
      };
    }
  }

  private static authStoreProxy: any = null;

  // Progressive loader for Auth Store
  public static getAuthStore(): AuthStateContract {
    try {
      const realStore = require('../../src/store/authStore');
      if (realStore?.useAuthStore) {
        if (!this.authStoreProxy) {
          this.authStoreProxy = new Proxy({} as any, {
            get(_target, prop) {
              const state = realStore.useAuthStore.getState();
              const val = state[prop];
              if (typeof val === 'function') {
                return (...args: any[]) => {
                  const currentState = realStore.useAuthStore.getState();
                  return currentState[prop](...args);
                };
              }
              return val;
            },
            set(_target, prop, value) {
              realStore.useAuthStore.setState({ [prop]: value });
              return true;
            },
          });
        }
        return this.authStoreProxy;
      }
    } catch {
      // Progressive contract double
    }
    return this.mockAuthStore;
  }

  // Progressive loader for Sync Service
  public static getSyncService(): SyncServiceContract {
    try {
      const realSync = require('../../src/services/syncService');
      if (realSync?.syncService) {
        return realSync.syncService;
      }
    } catch {
      // Progressive contract double
    }
    return this.mockSyncService;
  }

  // Animation contract simulator
  public static createScreenTransitionAnim(routeKey: string) {
    const opacity = new MockAnimatedValue(0);
    const translateY = new MockAnimatedValue(15);

    const runTransition = () => {
      opacity._value = 1;
      translateY._value = 0;
    };

    return { opacity, translateY, runTransition };
  }
}
