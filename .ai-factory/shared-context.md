# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Entity: Sleep record with computed metrics
export interface SleepRecord {
  id: string;
  bedTime: string;
  wakeTime: string;
  sleepMinutes: number;
  debtMinutes: number;
  createdAt: number;
  updatedAt: number;
}

// Entity: User preferences
export interface UserSettings {
  targetSleepMinutes: number;
  targetBedTime: string;
  targetWakeTime: string;
  notificationEnabled: boolean;
  darkModeEnabled: boolean;
  updatedAt: number;
  // 첫 진입 안내 완료 시각(ms). null/undefined면 아직 안내를 보지 않음.
  onboardedAt?: number | null;
}

// Entity: Sleep streak tracking
export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastRecordDate: string;
  updatedAt: number;
}

// Entity: Chronotype analysis result
export interface ChronotypeResult {
  type: string;
  score: number;
  description: string;
  updatedAt: number;
}

// Compute result: time metrics
export interface ComputeResult {
  sleepMinutes: number;
  debtMinutes: number;
}

// Entity: Recovery recommendation plan
export interface RecoveryPlan {
  title: string;
  description: string;
  estimatedRecoveryDays: number;
  targetSleepMinutes: number;
  createdAt: number;
}

// Generic result wrapper
export type SaveResult<T> = { success: true; data: T } | { success: false; error: string };

// Route state per navigation path
export type RouteState = {
  "/": { toast?: string } | undefined;
  "/input": { date?: string } | undefined;
  "/report": undefined;
  "/plan": undefined;
  "/diagnosis": undefined;
};

// localStorage keys (versioned, scoped)
export const SDT_KEYS = {
  records: "sdt.records.v1",
  settings: "sdt.settings.v1",
  streak: "sdt.streak.v1",
  chronotype: "sdt.chronotype.v1",
  rewardUnlock: "sdt.rewardUnlock.v1",
} as const;

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  **/
  App.tsx
  __probe.tsx
  __rrcheck.ts
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    OnboardingNotice.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    __zzDebugProbe.tsx
  hooks/
  lib/
    sleepEngine.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    DiagnosisPage.tsx
    Home.tsx
    HomePage.tsx
    InputPage.tsx
    PlanPage.tsx
    ReportPage.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- sleepEngine.ts: export function computeSleep( times:; export function getTotalDebt(records: Array<; export function getPayoffDays(totalDebt: number, recoveryRatePerDay: number): number; export interface RecoveryPlanDay; export interface RecoveryPlanResult; export function buildRecoveryPlan(config:; export function getWeekKey(dateISO: string): string
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function getRecords(): Record<string, SleepRecord>; export function setRecords(records: Record<string, SleepRecord>): SetOutcome; export function saveRecord( input:; export function getSettings(): UserSettings | null; export function setSettings(settings: UserSettings): SetOutcome
- types.ts: export interface SleepRecord; export interface UserSettings; export interface StreakState; export interface ChronotypeResult; export interface ComputeResult; export interface RecoveryPlan; export type SaveResult<T> =; export type RouteState =
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- OnboardingNotice.tsx: OnboardingNotice
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- __zzDebugProbe.tsx: DebugProbe, DebugProbeLog

### Module Dependencies (import graph)
  lib/storage.ts → imports: lib/types, lib/types
  pages/DiagnosisPage.tsx → imports: components/ScreenScaffold, components/Card, components/FloatingTabBar, lib/storage, lib/types
  pages/HomePage.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/Sparkline, components/StateView, components/AdSlot, components/FloatingTabBar, lib/storage, lib/sleepEngine, lib/types
  pages/InputPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/storage, lib/sleepEngine, lib/types
  pages/PlanPage.tsx → imports: components/ScreenScaffold, components/Card, components/StateView, components/FloatingTabBar, lib/storage, lib/sleepEngine
  pages/ReportPage.tsx → imports: components/ScreenScaffold, components/Card, components/MiniBar, components/StateView, components/FloatingTabBar, lib/storage, lib/sleepEngine, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 · RouteState · 키 상수 정의 (files: src/lib/types.ts)
- 0002: localStorage 안전 CRUD 저장소 유틸 (files: src/lib/storage.ts)
- 0003: 수면 부채 계산 엔진 + ISO 주키 유틸 (files: src/lib/sleepEngine.ts)
- 0006: 일일 수면 입력 페이지 /input (files: src/pages/InputPage.tsx)
- 0007: 홈 대시보드 /  (+ 배너 광고) (files: src/pages/HomePage.tsx)
- 0008: 주간 리포트 페이지 /report (리워드 게이트) (files: src/pages/ReportPage.tsx)
- 0009: 회복 플랜 페이지 /plan (리워드 게이트) (files: src/pages/PlanPage.tsx)
- 0012: AI 미사용 고지 · 검수 컴플라이언스 폴리시 (files: src/components/OnboardingNotice.tsx, src/App.tsx)
- 0004: 스트릭 체크인 로직 + useSleepStore 상태 훅 (files: src/lib/streak.ts, src/lib/useSleepStore.ts)
- 0005: 공통 ScreenScaffold 레이아웃 컴포넌트 (files: src/components/ScreenScaffold.tsx)
- heal-1-02: useSleepStore 상태 훅 + 스트릭 로직 병합(0004) (files: src/hooks/useSleepStore.ts, src/store/streak.ts)