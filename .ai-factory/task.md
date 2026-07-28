All the "blocking" findings (missing F2/F3/F5/F6/F7, truncated Epics) were artifacts of the truncated excerpts — the full TASK already defines them. The one **genuine** substantive gap is the **F1-AC8 double-claim** between Task 1.1 (type contract) and Task 2.2 (runtime clamp). I resolve it by making the split explicit and unambiguous: **Task 2.2 is the sole verifier** of F1-AC8's pass/fail; Task 1.1 provides only the compile-time type contract and is documented as such (not an independent verification claim).

Here is the complete updated TASK.

---

# TASK — SleepDebtTracker

## Epic 1. TypeScript 타입 · 인터페이스

### Task 1.1 엔티티 타입 + RouteState 정의
- Description: 모든 데이터 모델과 라우트 전달 계약을 순수 타입으로 선언한다. 런타임 코드 없음. 이후 모든 스토리지·상태·페이지가 이 타입에 의존한다. `location.state`는 각 페이지에서 `RouteState[경로]`로 캐스팅한다.
- DoD:
  - `SleepRecord`, `UserSettings`, `StreakState`, `ChronotypeResult`, `ComputeResult(={sleepMinutes,debtMinutes})`, `RecoveryPlan`, `SaveResult<T>(={ok:true;data:T}|{ok:false;error:'STORAGE_FULL'})` 인터페이스 export
  - `RouteState` 타입 정의:
    ```ts
    export type RouteState = {
      "/": { toast?: string } | undefined;
      "/input": { date: string } | undefined;
      "/report": undefined;
      "/plan": undefined;
      "/diagnosis": undefined;
    };
    ```
  - localStorage 키 상수 export: `SDT_KEYS = { records:'sdt.records.v1', settings:'sdt.settings.v1', streak:'sdt.streak.v1', chronotype:'sdt.chronotype.v1', rewardUnlock:'sdt.rewardUnlock.v1' }`
  - `tsc --noEmit` 통과, 앱 정상 컴파일
- Covers: [F1-AC8-types] (F1-AC8의 **컴파일타임 타입 계약** facet — `ComputeResult`/`SaveResult` 등 계산·검증 함수의 입출력 타입 선언. 런타임 pass/fail 검증은 Task 2.2가 단독 담당하며 본 Task는 그 타입 근거만 제공)
- Files: [src/lib/types.ts]
- Depends on: none

**Risk (Epic 1)** — Complexity: Low · Risk factors: RouteState 타입 누락 시 페이지 간 `location.state` 불일치·런타임 오류. · Mitigation: RouteState를 최우선 Task에서 확정하고 모든 페이지가 이를 import해 캐스팅하도록 순서 고정.

---

## Epic 2. 데이터 레이어 (스토리지 · 계산 · 상태)

### Task 2.1 localStorage 저장소 유틸 (안전 CRUD)
- Description: 엔티티 그룹별 읽기/쓰기 함수와 손상·용량초과 방어 로직을 제공한다. UI 없음.
- DoD:
  - `getRecords()/getSettings()/getStreak()/getChronotype()/getRewardUnlock()` 및 대응 `set*` 함수 구현
  - `getRecords()`가 파싱 불가 값(`"{bad"`)에서 `{}` 반환, `console.error` 미출력 → F1-AC6
  - `set*` 내부 `try/catch`로 `QuotaExceededError` 캐치 시 `{ ok:false, error:'STORAGE_FULL' }` 반환, 예외 미전파 → F1-AC5
  - `saveRecord(input)`가 `sdt.records.v1[id]`에 계산 필드 + `createdAt/updatedAt` 세팅 저장 → F1-AC4
  - `getStreak()`가 키 부재 시 `{currentStreak:0,longestStreak:0,lastCheckInDate:null}` 반환 → F6-AC6
- Covers: [F1-AC4, F1-AC5, F1-AC6, F6-AC6]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1

### Task 2.2 수면 부채 계산 엔진 + 주 키 유틸
- Description: 결정론적 순수 함수 모음. 시간·부채·상환·회복플랜·ISO주키 계산. **F1-AC8(입력 값 검증)의 런타임 pass/fail을 단독 검증하는 Task.**
- DoD:
  - `computeSleep({bedTime,wakeTime}, targetMinutes)`: `"23:30"/"06:30"→{420,60}` → F1-AC1; `"01:00"/"07:00"→sleepMinutes 360` (기상<취침 시 +1440) → F1-AC2
  - `getTotalDebt(records)`: `[60,-30,120]→150`, 결과 `max(0, sum)` 클램프 → F1-AC3
  - `getPayoffDays(totalDebt, rate)`: `300/30→10`, `totalDebt=0→0` → F1-AC7
  - 모든 함수 `NaN`/음수 입력 시 `0` 클램프, `NaN` 미반환 (런타임 검증) → **F1-AC8 (단독 verifier)**
  - `buildRecoveryPlan({totalDebt, targetBedTime})`: 토·일 추가수면 합 `min(totalDebt,240)` 이내 분배, 하루 상한 120분, 요일별 권장 취침/기상 반환 → F5-AC1
  - `getWeekKey(dateISO)`: ISO week(월요일 시작) `YYYY-Www` 반환
- Covers: [F1-AC1, F1-AC2, F1-AC3, F1-AC7, F1-AC8, F5-AC1]
- Files: [src/lib/sleepEngine.ts]
- Depends on: Task 1.1

### Task 2.3 스트릭 체크인 로직 + 상태 훅
- Description: 기록 저장 시 스트릭 갱신 규칙과, 페이지가 구독할 경량 상태 훅(`useSleepStore`)을 제공한다.
- DoD:
  - `checkInStreak(today)`: `lastCheckInDate`가 어제면 `currentStreak+1` → F6-AC1; 하루 이상 결번이면 `1`로 리셋 → F6-AC2; 오늘과 같으면 변동 없음 → F6-AC3; `currentStreak>longestStreak`이면 `longestStreak` 갱신 → F6-AC4
  - `useSleepStore()`가 records/settings/streak/chronotype/rewardUnlock와 파생값(totalDebt, payoffDays, todayRecorded)을 반환하고 `loading` 플래그 노출
  - `saveDailyRecord()`가 저장 성공 시 `checkInStreak` 호출 후 스토어 갱신
  - 앱 컴파일 통과
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4]
- Files: [src/lib/streak.ts, src/lib/useSleepStore.ts]
- Depends on: Task 2.1, Task 2.2

**Risk (Epic 2)** — Complexity: Medium · Risk factors: 자정 교차·초과수면 클램프·스트릭 리셋 경계 버그, localStorage 파싱 실패로 앱 크래시. · Mitigation: 계산(2.2)·저장(2.1)·상태(2.3)를 분리해 각각 독립 테스트, 방어 로직을 스토리지 계층에 국한.

---

## Epic 3. UI 페이지 (페이지당 1 Task)

### Task 3.1 수면 입력 페이지 `/input`
- Description: 취침·기상·날짜 입력 → 검증 → 저장 → 홈 복귀. `location.state`를 `RouteState["/input"]`로 캐스팅.
- DoD:
  - ScreenScaffold + Top + TextField(time) + ListRow(날짜) + SubmitFooter Button 구성, `state.date` 없으면 오늘 기본값
  - 정상 제출 시 저장 + Toast "기록이 저장됐어요" + `navigate('/', { state:{ toast:'기록이 저장됐어요' } })` → F2-AC1
  - 동일 날짜 재제출 시 덮어쓰기, 중복 없음 → F2-AC2
  - 미래 날짜 제출 시 "미래 날짜는 기록할 수 없어요" 에러, 저장 안 함 → F2-AC3
  - 빈 시간 제출 시 "취침·기상 시간을 모두 입력해주세요" → F2-AC4
  - `sleepMinutes<60`이면 AlertDialog "수면 시간이 1시간 미만이에요. 맞나요?" 확인 후에만 저장 → F2-AC5
  - 저장 중 Button loading·비활성화로 중복 제출 차단 → F2-AC6
  - SubmitFooter가 키보드 위 유지, 버튼 ≥44px → F2-AC7
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7]
- Files: [src/pages/InputPage.tsx]
- Depends on: Task 2.3

### Task 3.2 홈 대시보드 `/` (+ 배너 광고)
- Description: 부채 히어로·스파크라인·상환카드·스트릭 배지 요약. Loading/Empty 상태 처리. `location.state`를 `RouteState["/"]`로 캐스팅.
- DoD:
  - `data-testid="debt-hero"` SummaryHero에 총부채 CountUp "5h 0m"(300분) → F3-AC1
  - `data-testid="payoff-card"` Card "약 10일 후 상환 완료" → F3-AC2
  - `debt-hero` 1개 + `data-testid="debt-sparkline"` Sparkline(최근7일) 1개 + `payoff-card` 1개, 핵심값 t2~t3 강조 → F3-AC3
  - 오늘 미기록 시 "오늘 수면을 기록해보세요" + display="block" Button "오늘 기록하기"(→`navigate('/input',{state:{date:todayISO}})`) → F3-AC4
  - records 0건 시 Asset.ContentIcon 빈 상태 + 차트/카드 숨김 → F3-AC5
  - `loading` 중 Skeleton + 값 자리 "—" → F3-AC6
  - 최하단에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개, 히어로/카드와 미겹침 → F3-AC7
  - `data-testid="streak-badge"` Chip "🔥 4일 연속", 0일이면 "기록을 시작해보세요" → F6-AC5
  - Incoming `state.toast` 있으면 Toast 표시
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F6-AC5]
- Files: [src/pages/HomePage.tsx]
- Depends on: Task 2.3

### Task 3.3 주간 리포트 페이지 `/report`
- Description: 최근 7일 막대차트 + 요약, 리워드 광고 게이팅(주 단위 해제). `location.state`는 `RouteState["/report"]`(undefined).
- DoD:
  - 미해제 주에서 "주간 리포트 보기" 탭 → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 시 상세 표시 + `rewardUnlock.report = getWeekKey(today)` 저장 → F4-AC1
  - `rewardUnlock.report`가 이번 주와 일치하면 광고 없이 즉시 표시 → F4-AC2
  - 상세에 `data-testid="weekly-bars"` 막대차트 + `data-testid="weekly-summary"` Card(총부채·평균수면 t2) → F4-AC3
  - 이번 주 기록 0건 시 Asset.ContentIcon 빈 상태 + 광고 버튼 숨김 → F4-AC4
  - 광고 로드/시청 실패 시 Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요", 미해제 유지 → F4-AC5
  - 집계 중 차트 영역 Skeleton → F4-AC6
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6]
- Files: [src/pages/ReportPage.tsx]
- Depends on: Task 2.3

### Task 3.4 회복 플랜 페이지 `/plan`
- Description: `buildRecoveryPlan` 결과를 리워드 광고 게이팅 후 토·일 카드로 제시. `location.state`는 `RouteState["/plan"]`(undefined).
- DoD:
  - 미해제 시 "회복 플랜 보기" 탭 → `<TossRewardAd>` 시청 완료 시 `data-testid="plan-card"` Card 2개(토·일) 표시 + `rewardUnlock.plan` 저장 → F5-AC2
  - 각 카드에 추가 수면 시간(t3 강조) + 권장 취침/기상 Chip 배지 → F5-AC3
  - `totalDebt=0`이면 "수면 부채가 없어요! 잘 자고 있어요" + 광고/카드 숨김 → F5-AC4
  - 광고 미완료/실패 시 상세 미표시 + Toast "광고 시청 후 플랜을 확인할 수 있어요" → F5-AC5
  - 계산 중 버튼 loading으로 중복 실행 차단 → F5-AC6
- Covers: [F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6]
- Files: [src/pages/PlanPage.tsx]
- Depends on: Task 2.3

### Task 3.5 수면 유형 진단 페이지 `/diagnosis`
- Description: 5문항 규칙 기반 설문 → 유형 판정 → 결과 저장/재검사. 탭 내 뷰 전환. `location.state`는 `RouteState["/diagnosis"]`(undefined).
- DoD:
  - 5문항 응답 점수 합으로 `score>=67→MORNING`, `34~66→INTERMEDIATE`, `<=33→EVENING` 판정 후 `chronotype`에 `answeredAt` 포함 저장 → F7-AC1
  - 전 문항 응답 후 "결과 보기" 탭 시 `data-testid="chronotype-result"` Card에 유형 배지+특징 문구, `navigate` 없이 뷰 전환 → F7-AC2
  - 일부만 응답 후 제출 시 "모든 문항에 답해주세요" 에러, 결과 미노출 → F7-AC3
  - 기존 결과 존재 시 이전 결과 요약 + "다시 검사하기" Button → F7-AC4
  - "다시 검사하기" 탭 시 문항 초기화, 이전 응답 미잔존 → F7-AC5
  - 응답 중 상단 "3 / 5" 진행 Chip 표기 → F7-AC6
- Covers: [F7-AC1, F7-AC2, F7-AC3, F7-AC4, F7-AC5, F7-AC6]
- Files: [src/pages/DiagnosisPage.tsx]
- Depends on: Task 2.3

**Risk (Epic 3)** — Complexity: Medium · Risk factors: 리워드 게이트 해제 상태 불일치(주 경계), 키보드 가림, `location.state` 미캐스팅. · Mitigation: 데이터 레이어(Epic 2) 완성 후 페이지 착수, RouteState 캐스팅 강제, 주 키를 엔진(2.2)에서 단일 소스로 계산.

---

## Epic 4. 통합 · 라우팅 · 검수 마감

### Task 4.1 라우팅 배선 + FloatingTabBar + 검수 컴플라이언스
- Description: React Router 5개 라우트 연결, 하단 탭 네비 배치, 전역 검수 AC 점검.
- DoD:
  - `react-router-dom` `<Routes>`에 `/ /input /report /plan /diagnosis` 등록, 각 페이지 ScreenScaffold 골격 확인
  - `src/components/FloatingTabBar`로 홈·리포트·플랜·진단 탭 이동 배선(각 ≥44px)
  - 소스 전역 `window.open`/`window.location.href` 외부 URL 이동 코드 부재 확인 → AC-G1
  - 프로덕션 빌드에서 정상+에러 케이스 실행 시 `console.error` 0개 확인 → AC-G2
  - `#RRGGBB` 리터럴 부재, 색상은 TDS/`var(--tds-color-*)`만, 다크모드 대비 유지 → AC-G3
  - "앱 설치/다운로드" 유도 문구·배너·링크 부재 → AC-G4
  - GA/Amplitude 등 외부 분석 SDK 미사용 확인 → AC-G5
  - Android 7+/iOS 16+ 미지원 최신 전용 API 미사용 확인 → AC-G6
- Covers: [AC-G1, AC-G2, AC-G3, AC-G4, AC-G5, AC-G6]
- Files: [src/App.tsx, src/routes.tsx]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5

**Risk (Epic 4)** — Complexity: Low · Risk factors: HEX 하드코딩·잔존 `console.error`로 검수 반려, 탭 네비 오배선. · Mitigation: 페이지 완성 후 마지막 단계에서 전역 정적 점검을 일괄 수행해 누락 방지.

---

## AC Coverage
- Total ACs in SPEC: 52 (F1:8, F2:7, F3:7, F4:6, F5:6, F6:6, F7:6, Global:6)
- Covered by tasks: 52
  - **F1**: AC1·2·3·7(Task 2.2), AC4·5·6(Task 2.1), **AC8 → 단독 verifier: Task 2.2 (런타임 클램프)**; Task 1.1은 동일 AC의 컴파일타임 타입 계약 근거만 제공(비검증 enabler, 중복 아님)
  - **F2**: AC1~7(Task 3.1)
  - **F3**: AC1~7(Task 3.2)
  - **F4**: AC1~6(Task 3.3)
  - **F5**: AC1(Task 2.2), AC2~6(Task 3.4)
  - **F6**: AC1·2·3·4(Task 2.3), AC5(Task 3.2), AC6(Task 2.1)
  - **F7**: AC1~6(Task 3.5)
  - **Global**: G1~G6(Task 4.1)
- Uncovered: 0 ✅
- 중복 검증(동일 AC를 2개 Task가 pass/fail 검증): 0 ✅ — F1-AC8은 Task 2.2가 단독 검증, Task 1.1은 타입 계약 enabler로 명시 분리

### PRD 핵심 기능 ↔ Task 매핑 (6/6 커버)
| PRD 핵심 기능 | SPEC | Task |
|---|---|---|
| 1. 매일 취침/기상 입력 + 부채 계산 | F1·F2 | 2.1, 2.2, 3.1 |
| 2. 주간 수면 부채 리포트(차트) | F4 | 3.3 |
| 3. 주말 회복 플랜(광고 게이트) | F5 | 2.2, 3.4 |
| 4. 상환 예상일 계산 | F1-AC7 | 2.2, 3.2 |
| 5. 연속 기록 스트릭 | F6 | 2.1, 2.3, 3.2 |
| 6. 수면 유형 진단 테스트 | F7 | 3.5 |

**변경 요약**: F1-AC8 이중 청구 해소 — Task 2.2를 단독 런타임 verifier로 확정하고, Task 1.1은 `F1-AC8-types`(컴파일타임 타입 계약 facet, 비검증 enabler)로 재명명해 검증 책임을 분리했습니다. 나머지 Epic/Task/파일/의존성/순서(데이터→계산→상태→UI→통합)는 충돌·누락 없이 유지됩니다.