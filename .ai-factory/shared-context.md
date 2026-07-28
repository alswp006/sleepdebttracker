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
  targetMinutes: number;
  recoveryRatePerDay: number;
  onboardedAt: number | null;
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
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.