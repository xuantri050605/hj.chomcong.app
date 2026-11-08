# Project: Nâng cấp Giao diện, Chuyển động Mượt mà, Supabase Auth & Đồng bộ Offline-First

## Architecture
- **Framework**: Expo SDK 48 (`expo ~48.0.0`, `react 18.2.0`, `react-native 0.71.14`, `react-native-web ~0.18.10`)
- **Bundler**: Webpack với subpath `/hj.chomcong.app/` phục vụ triển khai GitHub Pages.
- **Routing**: SPA Router điều khiển bởi URL hash và state nội bộ (`src/utils/navigationState.ts`, `src/App.tsx`).
- **UI & Animations**: Modern Executive FinTech Clean Design System, 100% React Native built-in `Animated` API (`opacity` và `transform`) bảo đảm chuẩn 60fps trên Web & Mobile, zero xung đột Webpack/Babel.
- **State Management**: Zustand stores (`attendanceStore`, `salaryStore`, `geofenceStore`, `authStore`).
- **Persistence**: Multi-adapter persistence (`InMemoryStorage` cho Jest, `WebStorageAdapter` cho Web, `expo-sqlite` cho Mobile) kết hợp `sync_queue` Offline-First.
- **Backend & Cloud**: Supabase JS v2, Supabase Auth, PostgreSQL với Row Level Security (RLS) bảo mật tuyệt đối theo `auth.uid() = user_id`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Modern Design System & Theme Tokens | Hệ thống token bảng màu FinTech, typography, 4 cấp elevation, responsive helpers | M1 | Survey E2 |
| 2 | Smooth Screen Transitions | Hiệu ứng chuyển cảnh route mượt mà 60fps (opacity + translateY) khi chuyển giữa 5 tab | M1 | R1, Survey E2 |
| 3 | Modern Dashboard Screen | Giao diện Dashboard mới, thẻ KPI 4 cột trên Desktop/2 cột Mobile, thanh tiến độ sinh động | M1 | R1, Survey E2 |
| 4 | Modern Attendance Screen | Thẻ live clock với hiệu ứng pulse khi trong ca, bảng lịch trực quan, modal chấm công mượt mà | M1 | R1, Survey E2 |
| 5 | Modern SalaryConfig Screen | Bố cục cấu hình lương 2 cột trực quan, tính toán đơn giá giờ tức thì | M1 | R1, Survey E2 |
| 6 | Modern PayrollResult Screen | Bảng lương định dạng chuyên nghiệp, hỗ trợ accordion thu gọn/mở rộng từng nhóm mục | M1 | R1, Survey E2 |
| 7 | Modern History Screen | Danh sách lịch sử lưu trữ thẻ thanh lịch, gắn nhãn trạng thái và hành động xác nhận an toàn | M1 | R1, Survey E2 |
| 8 | Enhanced Navigation & Header | AppHeader hiện đại hiển thị viên nang trạng thái người dùng & sync, BottomNavigation mượt mà | M1 | R1, Survey E2 |
| 9 | Supabase Client & Universal Storage | Cấu hình `@supabase/supabase-js` v2 kèm `UniversalStorageAdapter` tương thích Web, Mobile, Jest | M2 | R3, Survey E3 |
| 10 | Supabase Auth State (`useAuthStore`) | Quản lý trạng thái xác thực: user, session, profile, isLoading, lỗi | M2 | R2, Survey E3 |
| 11 | AuthModal UI & Flows | Modal đăng nhập, đăng ký tài khoản mới, thông báo lỗi trực quan, chế độ khách offline | M2 | R2, Survey E2, E3 |
| 12 | Session Persistence & Auto Restore | Duy trì phiên làm việc qua tải lại trang (Web localStorage) và mở lại ứng dụng (Mobile) | M2 | R2, Survey E3 |
| 13 | Logout Flow | Đăng xuất an toàn, xóa phiên đám mây, đưa UI về trạng thái chưa đăng nhập | M2 | R2, Survey E3 |
| 14 | SQL Database Schema & RLS Migrations | Tệp SQL định nghĩa 5 bảng (`profiles`, `salary_configs`, `attendance_records`, `payroll_history`, `sync_events`) kèm RLS `auth.uid() = user_id` và trigger tạo profile | M3 | R3, Survey E3 |
| 15 | Environment Config Template | Cập nhật `.env.example` với `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY` | M3 | R3, Survey E1, E3 |
| 16 | Offline-First Sync Engine | Local-as-source-of-truth với hàng đợi `sync_queue`, tự động đẩy/kéo khi có mạng và đăng nhập | M3 | R3, Survey E3 |
| 17 | Conflict Resolution (LWW) | Cơ chế giải quyết xung đột Last-Write-Wins dựa trên `updated_at` | M3 | R3, Survey E3 |
| 18 | Sync Status Indicator | Biểu tượng trạng thái đồng bộ động (Đã đồng bộ, Đang đồng bộ, Ngoại tuyến, Lỗi) trên Header | M3 | R3, Survey E2, E3 |
| 19 | Comprehensive E2E Test Suite | Bộ kiểm thử E2E 4 tầng (Tiers 1-4) kiểm chứng giao diện, auth, offline sync và hồi quy | E2E_TRACK | R1, R2, R3 |
| 20 | Final Integration & Adversarial Hardening | Vượt qua 100% E2E tests, typecheck, build:web và kiểm thử biên adversarial (Tier 5) | M4 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Suite Track | Thiết kế hạ tầng test E2E opaque-box và bộ test cases Tiers 1-4 | none | DONE |
| M1 | Modern UI & Smooth Transitions | Nâng cấp toàn diện 5 màn hình chính, header, navigation và animation hooks 60fps | none | DONE |
| M2 | Supabase Auth & Session | Supabase client setup, useAuthStore, AuthModal (Login/Register/Logout), session persistence | M1 (UI contracts) | IN_PROGRESS |
| M3 | Supabase Offline Sync & SQL Migrations | SQL migration file with RLS, .env.example, syncService, sync queue, persistence adapter hooks | M2 | PLANNED |
| M4 | Final Integration & E2E Acceptance | Tích hợp hoàn chỉnh, vượt qua 100% E2E test suite (Tiers 1-4) và Adversarial Hardening (Tier 5) | E2E, M1, M2, M3 | PLANNED |

## Interface Contracts
### UI ↔ AuthModal
- `AppHeader` kích hoạt `openAuthModal()` từ `useAuthStore` hoặc callback props.
- `AuthModal` nhận `visible: boolean`, `onClose: () => void`. Hỗ trợ chuyển tab Login / Register.
- `useAuthStore`:
  ```typescript
  interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    signIn: (email: string, password: string) => Promise<boolean>;
    signUp: (email: string, password: string, fullName?: string) => Promise<boolean>;
    signOut: () => Promise<void>;
    clearError: () => void;
  }
  ```

### Storage ↔ SyncService
- `persistence.ts`: Bổ sung hook/hàm enqueue mutation vào `sync_queue` mỗi khi có thay đổi bản ghi chấm công hoặc cấu hình lương.
- `syncService`:
  ```typescript
  interface SyncService {
    syncAll: (userId: string) => Promise<{ pushed: number; pulled: number; errors: any[] }>;
    pushLocalQueue: (userId: string) => Promise<number>;
    pullRemoteChanges: (userId: string) => Promise<number>;
    getSyncStatus: () => 'synced' | 'syncing' | 'offline' | 'error';
  }
  ```

### Animation Contract
- Custom hooks chuẩn built-in React Native `Animated`:
  - `useScreenTransition(routeKey: string)`: Trả về `{ opacity: Animated.Value, translateY: Animated.Value }`.
  - `useButtonPressAnim()`: Trả về `{ scale: Animated.Value, onPressIn: () => void, onPressOut: () => void }`.
  - `usePulseAnim(active: boolean)`: Trả về `{ pulseScale: Animated.Value, pulseOpacity: Animated.Value }`.

## Code Layout
- `src/theme/`: Hệ thống theme tokens mở rộng (`colors.ts`, `spacing.ts`, `typography.ts`, `elevation.ts`, `theme.ts`).
- `src/hooks/`: Hooks hiệu ứng chuyển động (`useScreenTransition.ts`, `useButtonPressAnim.ts`, `usePulseAnim.ts`).
- `src/components/`:
  - `AppHeader.tsx`, `BottomNavigation.tsx` (nâng cấp giao diện & animation)
  - `AuthModal.tsx` (giao diện đăng nhập / đăng ký / đăng xuất)
  - `SyncStatusBadge.tsx` (huy hiệu trạng thái đồng bộ)
- `src/screens/`:
  - `Dashboard.tsx`, `Attendance.tsx`, `SalaryConfig.tsx`, `PayrollResult.tsx`, `History.tsx` (giao diện hiện đại hóa)
- `src/services/`:
  - `supabaseClient.ts` (khởi tạo Supabase client đa nền tảng)
  - `syncService.ts` (bộ đồng bộ dữ liệu đám mây offline-first)
  - `universalStorage.ts` (storage adapter cho web/mobile/jest)
- `src/store/`:
  - `authStore.ts` (quản lý trạng thái xác thực và phiên)
- `supabase/migrations/`:
  - `20261107_initial_schema_and_rls.sql` (kịch bản migration cơ sở dữ liệu với chính sách RLS)
- `.env.example`: Chứa `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `e2e/`: Hạ tầng và bộ test cases E2E Tiers 1-4.
