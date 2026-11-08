import { create } from 'zustand';
import { getSupabaseClient, Session, User } from '../services/supabaseClient';
import { detectLegacyData } from '../services/migration/migrationDetector';
import { LocalDataSummary } from '../services/migration/migrationTypes';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isOfflineOnly: boolean;
  error: string | null;

  // Modal UI state
  isAuthModalOpen: boolean;
  authModalMode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

  // Migration state
  isMigrationModalOpen: boolean;
  legacySummary: LocalDataSummary | null;

  // Actions
  initializeAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  checkLegacyData: (overrideUserId?: string) => Promise<void>;
  continueAsGuest: () => void;
  clearError: () => void;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD') => void;
  closeAuthModal: () => void;
  openMigrationModal: () => void;
  closeMigrationModal: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  isOfflineOnly: false,
  error: null,
  isAuthModalOpen: false,
  authModalMode: 'LOGIN',
  isMigrationModalOpen: false,
  legacySummary: null,

  initializeAuth: async () => {
    const supabase = getSupabaseClient();
    try {
      set({ isLoading: true });
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }

      if (data.session?.user) {
        const sessionUser = data.session.user;
        const fullName =
          sessionUser.fullName ||
          sessionUser.user_metadata?.full_name ||
          sessionUser.email?.split('@')[0] ||
          'Người dùng';

        const user: User = {
          ...sessionUser,
          fullName,
        };

        const profile: UserProfile = {
          id: sessionUser.id,
          email: sessionUser.email,
          fullName,
          avatarUrl: sessionUser.user_metadata?.avatar_url,
        };

        set({
          user,
          session: data.session,
          profile,
          isOfflineOnly: false,
          error: null,
        });
      }

      // Listen for background auth state updates (refresh, signout, etc.)
      supabase.auth.onAuthStateChange((event, newSession) => {
        if (newSession?.user) {
          const u = newSession.user;
          const fullName =
            u.fullName || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Người dùng';
          const user: User = { ...u, fullName };
          const profile: UserProfile = {
            id: u.id,
            email: u.email,
            fullName,
            avatarUrl: u.user_metadata?.avatar_url,
          };
          set({
            user,
            session: newSession,
            profile,
            isOfflineOnly: false,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, profile: null });
        }
      });
    } catch (err: any) {
      set({ error: err?.message || 'Lỗi khi khôi phục phiên đăng nhập' });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  signIn: async (email: string, password: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        let msg = error.message;
        if (error.message === 'Invalid login credentials') {
          msg = 'Email hoặc mật khẩu không chính xác.';
        } else if (
          error.message === 'Email not confirmed' ||
          (error as any).error_code === 'email_not_confirmed'
        ) {
          msg =
            'Tài khoản chưa được kích hoạt do cài đặt Supabase đang bật "Confirm email". Vui lòng kiểm tra thư mục Spam hoặc tắt "Confirm email" trong Supabase Auth Settings.';
        }
        set({ error: msg, isLoading: false, user: null, session: null, profile: null });
        return false;
      }

      if (data.user && data.session) {
        const fullName =
          data.user.fullName ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Người dùng';

        const user: User = { ...data.user, fullName };
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          fullName,
          avatarUrl: data.user.user_metadata?.avatar_url,
        };

        set({
          user,
          session: data.session,
          profile,
          isLoading: false,
          error: null,
          isOfflineOnly: false,
          isAuthModalOpen: false,
        });

        // Check for legacy local data to offer seamless migration
        void get().checkLegacyData(user.id);

        return true;
      }

      set({ error: 'Không nhận được phiên làm việc', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err?.message || 'Đăng nhập thất bại', isLoading: false });
      return false;
    }
  },

  signUp: async (email: string, password: string, fullName?: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    set({ isLoading: true, error: null });

    try {
      const resolvedName = (fullName || email.split('@')[0] || 'Người dùng').trim();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: resolvedName,
          },
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false, user: null, session: null, profile: null });
        return false;
      }

      if (data.user) {
        if (!data.session) {
          set({
            isLoading: false,
            error:
              'Đăng ký thành công! Dự án Supabase đang bật bắt buộc xác thực email ("Confirm email"). Bạn hãy vào Supabase Dashboard > Authentication > Providers > Email và TẮT mục "Confirm email" để có thể đăng nhập ngay mà không cần chờ mail.',
          });
          return false;
        }

        const user: User = {
          ...data.user,
          fullName: resolvedName,
        };
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          fullName: resolvedName,
        };

        set({
          user,
          session: data.session,
          profile,
          isLoading: false,
          error: null,
          isOfflineOnly: false,
          isAuthModalOpen: false,
        });

        // Check for legacy local data to offer seamless migration
        void get().checkLegacyData(user.id);

        return true;
      }

      set({ error: 'Đăng ký không thành công', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err?.message || 'Đăng ký thất bại', isLoading: false });
      return false;
    }
  },

  resetPassword: async (email: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    set({ isLoading: true, error: null });
    try {
      const redirectUrl =
        typeof window !== 'undefined' && window.location
          ? `${window.location.origin}${window.location.pathname}`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });
      if (error) {
        let msg = error.message;
        if (error.message.includes('rate limit')) {
          msg = 'Đã vượt quá giới hạn gửi mail của Supabase. Vui lòng thử lại sau vài phút.';
        }
        set({ error: msg, isLoading: false });
        return false;
      }
      set({ isLoading: false, error: null });
      return true;
    } catch (err: any) {
      set({ error: err?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu', isLoading: false });
      return false;
    }
  },

  checkLegacyData: async (overrideUserId?: string) => {
    const uid = overrideUserId || get().user?.id;
    if (!uid) return;
    try {
      const summary = await detectLegacyData(uid);
      set({ legacySummary: summary });
      if (summary.hasLegacyData && !summary.alreadyMigrated) {
        set({ isMigrationModalOpen: true });
      }
    } catch {
      // Safe fallback
    }
  },

  signOut: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Local fallback clearing
    } finally {
      // Isolate accounts: clear in-memory sensitive data from stores on logout
      try {
        const { useAttendanceStore } = require('./attendanceStore');
        const { useSalaryStore } = require('./salaryStore');
        const { DEFAULT_CONFIG } = require('../engine/payrollCalculator');
        useAttendanceStore.setState({ items: [] });
        useSalaryStore.setState({ config: DEFAULT_CONFIG });
      } catch {
        // Safe require fallback
      }

      set({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
        error: null,
        isOfflineOnly: true,
        isAuthModalOpen: false,
        isMigrationModalOpen: false,
        legacySummary: null,
      });
    }
  },

  continueAsGuest: () => {
    set({ isOfflineOnly: true, error: null, isAuthModalOpen: false });
  },

  clearError: () => {
    set({ error: null });
  },

  openAuthModal: (mode: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' = 'LOGIN') => {
    set({ isAuthModalOpen: true, authModalMode: mode, error: null });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false, error: null });
  },

  openMigrationModal: () => set({ isMigrationModalOpen: true }),
  closeMigrationModal: () => set({ isMigrationModalOpen: false }),
}));

export default useAuthStore;
