# TEST_INFRA.md — E2E Testing Infrastructure Specification

## 1. Executive Overview & Testing Philosophy
This document establishes the End-to-End (E2E) testing infrastructure, methodology, and execution framework for the **Chấm Công & Bảng Lương (Attendance & Payroll)** modern capability showcase.

### Core Principles:
- **Opaque-Box & Requirement-Driven**: Tests are designed strictly from user-facing specifications (`ORIGINAL_REQUEST.md`) and architectural contracts (`PROJECT.md § Feature Inventory & Interface Contracts`). They exercise system boundaries through observable behavior without coupling to private implementation trivia.
- **Zero Production Modification**: Test code resides entirely within `e2e/` and `__tests__/`. No production source code (`src/`) is altered to facilitate testing.
- **Progressive Testability & Contract Conformance**: The suite employs a robust contract-adapter harness (`e2e/harness/testHarness.ts`). As implementation milestones (M1 UI/Animation, M2 Supabase Auth, M3 Offline Sync & RLS) deliver production modules, tests seamlessly validate live code while guaranteeing immediate executability and zero blocking during parallel multi-agent development.
- **Deterministic & Hermetic**: Every test case initializes its own isolated state (in-memory storage, clean store instances, mock timers, simulated network conditions) and performs deterministic cleanup. No test relies on preceding execution order.

---

## 2. Test Execution & Runner Architecture

The test suite runs on **Jest (v29)** with **ts-jest** under a unified TypeScript configuration:

```bash
# 1. Run the entire E2E test suite (all 4 Tiers)
npx jest e2e --runInBand

# 2. Run all project tests (Unit + Existing Regression + E2E)
npm test

# 3. Run individual Tiers
npx jest e2e/tier1-features --runInBand
npx jest e2e/tier2-boundaries --runInBand
npx jest e2e/tier3-interactions --runInBand
npx jest e2e/tier4-scenarios --runInBand

# 4. Generate coverage report
npm run test:coverage
```

### Pass/Fail Semantics:
- **PASS**: All assertions succeed, mathematical formulas evaluate to exact currency amounts (VND), state transitions match specification, and contract schemas validate.
- **FAIL**: Any assertion mismatch, uncaught promise rejection, unhandled exception, NaN propagation in salary/hours calculations, or contract invariant violation.

---

## 3. Four-Tier Testing Methodology

```
┌────────────────────────────────────────────────────────┐
│  Tier 4: Real-World Monthly Workflows & Scenarios       │
│  (Multi-step realistic employee lifecycles, sync, LWW) │
├────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Interactions                    │
│  (Pairwise subsystem combinations: Auth + Sync + Calc) │
├────────────────────────────────────────────────────────┤
│  Tier 2: Boundary Value Analysis & Corner Cases        │
│  (>=5 edge cases per feature: limits, nulls, corrupt)  │
├────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (Category-Partition)         │
│  (>=5 isolated tests per feature across Features 1-18) │
└────────────────────────────────────────────────────────┘
```

### Tier 1: Isolated Feature Coverage (>=5 test cases per feature)
Covers all 18 features from `PROJECT.md § Feature Inventory` in isolation:
1. **F01 - Modern Design System & Theme Tokens**: FinTech palette, 4 elevation levels, typography scale, responsive helpers, color contrast.
2. **F02 - Smooth Screen Transitions**: 60fps timing, `opacity` & `translateY` animated interpolations, route transitions, unmount stability.
3. **F03 - Modern Dashboard Screen**: KPI grid layout (4-col desktop / 2-col mobile), animated progress bars, live stats, quick actions.
4. **F04 - Modern Attendance Screen**: Live clock pulse animation, calendar projection, clock in/out states, GPS accuracy/distance, manual modal.
5. **F05 - Modern SalaryConfig Screen**: 2-column layout, instant hourly rate recalculation, input sanitation, allowance fields, persistence.
6. **F06 - Modern PayrollResult Screen**: Professional layout, accordion collapsible sections, gross-to-net breakdown, print/export structure.
7. **F07 - Modern History Screen**: Card list rendering, status badges, deletion confirmation safety, month filtering, empty states.
8. **F08 - Enhanced Navigation & Header**: User profile pill, sync indicator capsule, bottom tab transitions, route parsing.
9. **F09 - Supabase Client & Universal Storage**: Multi-adapter storage (Node/Web/Mobile), initialization, error fallback, get/set/remove contract.
10. **F10 - Supabase Auth State (`useAuthStore`)**: Sign in, sign up, sign out, session tokens, error state lifecycle.
11. **F11 - AuthModal UI & Flows**: Modal visibility, Login/Register tab switching, form validation, guest mode fallback.
12. **F12 - Session Persistence & Auto Restore**: Token storage, auto-restore on boot, expired token handling, refresh token simulation.
13. **F13 - Logout Flow**: Session purge, store reset, storage cleanup, redirect to unauthenticated view.
14. **F14 - SQL Database Schema & RLS Migrations**: 5 core tables, primary/foreign keys, `auth.uid() = user_id` RLS policies, trigger definition.
15. **F15 - Environment Config Template**: `.env.example` validation, required Supabase keys, formatting, safety against leaked secrets.
16. **F16 - Offline-First Sync Engine**: `sync_queue` mutation enqueuing, offline store isolation, push/pull network reconciliation.
17. **F17 - Conflict Resolution (LWW)**: Last-Write-Wins timestamps, client vs server resolution, identical timestamp tie-breakers.
18. **F18 - Sync Status Indicator**: Header indicator states (`synced`, `syncing`, `offline`, `error`), badge rendering, retry triggers.

### Tier 2: Boundary Value Analysis & Corner Cases (>=5 test cases per feature)
Validates system resilience under stress and adverse conditions:
- **Extremes & Zero-bounds**: 0 basic salary, 0 standard hours, negative allowances, 100% deduction penalties, 100M VND salaries.
- **Time & Calendar Anomalies**: Overnight shifts crossing midnight (22:00 -> 06:00), 0-minute shifts, leap years (Feb 29), duplicate clock-ins.
- **Network & Storage Failures**: Storage quota exceeded, network dropouts mid-sync, malformed session tokens, corrupted JSON cache.
- **Adversarial & Security**: SQL injection and XSS payloads in notes/names, unauthorized RLS access attempts, invalid route hashes.

### Tier 3: Cross-Feature Interactions (Pairwise Combinations)
Validates emergent behavior across module boundaries:
- Auth Session + Navigation Header (profile pill updates dynamically on login/logout).
- Attendance Clock-in + Dashboard KPI (live hour counters increment instantly).
- SalaryConfig + PayrollResult Calculation (rate changes trigger instant net salary updates).
- Offline Clock-in + Sync Queue + Sync Status Indicator (status changes to `offline`, queues mutation, switches to `synced` upon reconnect).
- Multi-User Isolation + RLS Policies (User A mutations never bleed into User B local or cloud stores).

### Tier 4: Real-World Monthly Workflows & Scenarios
Comprehensive end-to-end user journeys mirroring authentic enterprise usage:
- **Scenario 1**: Complete New Employee Monthly Onboarding & Payroll Cycle (Registration -> Config -> 22 days attendance + overtime + night shifts -> Payroll calculation -> History archive).
- **Scenario 2**: Offline Field Worker Multi-Day Attendance & Cloud Synchronization (5 days offline check-ins with GPS metadata -> network reconnection -> automatic queue drainage -> conflict resolution).
- **Scenario 3**: Complex Vietnamese Enterprise Payroll with Statutory Insurance & Special Allowances (Standard hours, OT 150%, OT 200%, Night 130%, Seniority, Attendance bonus, Union fee, Personal Income Tax refund).
- **Scenario 4**: Cross-Device Multi-Session Concurrency & LWW Reconciliation (Device A and Device B simultaneous edits reconciled cleanly via LWW without data corruption).
- **Scenario 5**: Security, Tamper Resistance & Session Expiry Lifecycle.

---

## 4. Requirement & Feature Traceability Matrix

| Requirement | Feature IDs | Primary Test Suites | Total Test Target |
|---|---|---|---|
| **R1. Modern UI & Animations** | F01, F02, F03, F04, F05, F06, F07, F08 | `e2e/tier1-features/feature_01` to `08`, `e2e/tier2-boundaries/tier2_ui_navigation_boundaries.test.ts` | >= 80 tests |
| **R2. Supabase Auth & Session** | F10, F11, F12, F13 | `e2e/tier1-features/feature_10` to `13`, `e2e/tier2-boundaries/tier2_auth_session_boundaries.test.ts` | >= 40 tests |
| **R3. Supabase Sync & RLS** | F09, F14, F15, F16, F17, F18 | `e2e/tier1-features/feature_09`, `14` to `18`, `e2e/tier2-boundaries/tier2_sync_offline_boundaries.test.ts` | >= 60 tests |
| **Cross-Feature Integrations** | All | `e2e/tier3-interactions/tier3_cross_feature_interactions.test.ts` | >= 15 tests |
| **Real-World Monthly Scenarios** | All | `e2e/tier4-scenarios/tier4_real_world_scenarios.test.ts` | >= 5 scenarios |
| **Total Test Suite** | **F01 - F18** | **All 4 Tiers** | **>= 200 tests** |
