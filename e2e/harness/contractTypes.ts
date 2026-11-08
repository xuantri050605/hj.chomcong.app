// Interface Contracts and Domain Types for E2E Testing Suite
// Grounded in PROJECT.md § Interface Contracts & Architecture

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // UNIX timestamp in ms
  user: UserProfile;
}

export interface AuthStateContract {
  user: UserProfile | null;
  session: UserSession | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export type SyncStatusType = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncMutation {
  id: string;
  userId: string;
  table: 'attendance_records' | 'salary_configs' | 'payroll_history' | 'profiles';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  recordId: string;
  payload: any;
  clientTimestamp: string;
  retryCount: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface SyncServiceContract {
  syncAll: (userId: string) => Promise<{ pushed: number; pulled: number; errors: any[] }>;
  pushLocalQueue: (userId: string) => Promise<number>;
  pullRemoteChanges: (userId: string) => Promise<number>;
  getSyncStatus: () => SyncStatusType;
}

export interface UniversalStorageContract {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface ThemeTokensContract {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primarySoft: string;
    primaryBorder: string;
    success: string;
    warning: string;
    danger: string;
    purple: string;
    cyan: string;
    slate900: string;
    slate800: string;
    slate700: string;
    slate600: string;
    slate500: string;
    slate400: string;
    slate300: string;
    slate200: string;
    slate100: string;
    slate50: string;
    white: string;
    background: string;
    cardBackground: string;
    border: string;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: Record<string, any>;
  typography?: Record<string, any>;
  elevation?: Record<string, any>;
}
