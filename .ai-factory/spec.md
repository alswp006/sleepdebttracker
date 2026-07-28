# SPEC — SleepDebtTracker

## Common Principles
- **플랫폼**: Vite + React + TypeScript + React Router(`react-router-dom`), UI는 전부 TDS(`@toss/tds-mobile`). 데이터는 localStorage.
- **인증**: 토스 앱이 세션을 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 상태만 확인.
- **AI 미사용**: 수면 부채 계산·회복 플랜·유형 진단은 전부 결정론적 규칙 기반 계산이며 생성형 AI를 사용하지 않는다 → 생성형 AI 고지 의무 대상 아님.
- **모든 시간 계산 단위**: 분(minute) 정수. 화면 표기는 `Xh Ym` 포맷.
- **취침/기상 자정 교차 처리**: `기상 < 취침`이면 익일 기상으로 간주해 +1440분.
- **색상**: HEX 하드코딩 금지, TDS 컴포넌트 또는 `var(--tds-color-*)`만 사용(다크모드 지원).
- **외부 이탈 금지**: `window.open`/`window.location.href`로 외부 URL 이동 금지. 외부 로깅(GA/Amplitude) 금지.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`. 콘솔에서 env 주입.
- **터치 타깃**: 모든 인터랙티브 요소 ≥ 44px.
- **페이지 골격**: 모든 화면은 `ScreenScaffold`(PageShell)로 감싼다. raw div 골격 금지.

---

## Data Models

### SleepRecord — 하루 수면 기록
| field | type | constraints |
|---|---|---|
| id | `string` | `YYYY-MM-DD` (기록 날짜, PK) |
| bedTime | `string` | `HH:mm` (취침), 필수 |
| wakeTime | `string` | `HH:mm` (기상), 필수 |
| sleepMinutes | `number` | 계산값, 60~1080 |
| debtMinutes | `number` | `targetMinutes - sleepMinutes` (음수 가능=초과수면) |
| createdAt | `number` | epoch ms |
| updatedAt | `number` | epoch ms |

```ts
interface SleepRecord {
  id: string;          // "2026-07-29"
  bedTime: string;     // "23:30"
  wakeTime: string;    // "06:30"
  sleepMinutes: number;// 420
  debtMinutes: number; // 60
  createdAt: number;
  updatedAt: number;
}
```

### UserSettings — 사용자 설정
```ts
interface UserSettings {
  targetMinutes: number;   // 목표 수면(분), default 480 (8h), 범위 240~720
  recoveryRatePerDay: number; // 하루 상환 가능 분, default 30, 범위 10~120
  onboardedAt: number | null; // 첫 진입 고지 확인 시각
}
```

### StreakState — 연속 기록 스트릭
```ts
interface StreakState {
  currentStreak: number;   // 현재 연속일
  longestStreak: number;   // 최고 기록
  lastCheckInDate: string | null; // "2026-07-29"
}
```

### ChronotypeResult — 수면 유형 진단 결과
```ts
interface ChronotypeResult {
  type: 'MORNING' | 'EVENING' | 'INTERMEDIATE';
  score: number;           // 0~100 (높을수록 아침형)
  answeredAt: number;      // epoch ms
}
```

### localStorage 키 · 크기 추정
| key | shape | 추정 크기 |
|---|---|---|
| `sdt.records.v1` | `Record<string, SleepRecord>` (날짜→기록) | 1건 ≈ 180B × 365일 ≈ **65KB/년** |
| `sdt.settings.v1` | `UserSettings` | ≈ 120B |
| `sdt.streak.v1` | `StreakState` | ≈ 90B |
| `sdt.chronotype.v1` | `ChronotypeResult \| null` | ≈ 80B |
| `sdt.rewardUnlock.v1` | `{ report: string \| null; plan: string \| null }` (게이트 해제된 주 키, `YYYY-Www`) | ≈ 60B |
**총합**: 정상 사용(1~2년) 기준 < 200KB. 5MB 한도 대비 안전.

---

## Feature List

### F1. 데이터 레이어 & localStorage 저장소
- Description: 모든 화면이 공유하는 수면 기록·설정·스트릭·진단 결과의 읽기/쓰기 유틸과 수면 부채 계산 엔진을 제공한다. UI 없이 순수 함수/스토리지 모듈로 구성하며 이후 모든 기능이 이 계층에 의존한다.
- Data: `SleepRecord`, `UserSettings`, `StreakState`, `ChronotypeResult`
- API: 없음(로컬 전용)
- Requirements:
- AC-1 [U][P0]: Scenario: 수면 시간 계산
  - Given `targetMinutes = 480`
  - When `computeSleep({ bedTime: "23:30", wakeTime: "06:30" })` 호출
  - Then `sleepMinutes = 420`, `debtMinutes = 60` 반환
- AC-2 [U][P0]: Scenario: 자정 교차 계산
  - Given 취침이 기상보다 늦은 값
  - When `computeSleep({ bedTime: "01:00", wakeTime: "07:00" })` 호출
  - Then `sleepMinutes = 360` 반환 (음수 없이 익일 처리)
- AC-3 [U][P0]: Scenario: 누적 부채 합산
  - Given records에 `debtMinutes` 값이 `[60, -30, 120]`인 3건
  - When `getTotalDebt()` 호출
  - Then `150`(분) 반환 (초과수면 -30 상쇄 포함, 최소 0으로 클램프)
- AC-4 [E][P0]: Scenario: 기록 저장
  - When `saveRecord({ id: "2026-07-29", bedTime: "23:30", wakeTime: "06:30" })` 호출
  - Then `sdt.records.v1["2026-07-29"]`에 계산 필드 포함 저장되고 `createdAt`/`updatedAt` 세팅
- AC-5 [W][P1]: Scenario: localStorage 용량 초과
  - Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  - When `saveRecord` 호출
  - Then 저장 실패를 `{ ok: false, error: "STORAGE_FULL" }`로 반환하고 예외를 상위로 던지지 않음
- AC-6 [W][P1]: Scenario: 손상된 저장 데이터 복구
  - Given `sdt.records.v1` 값이 파싱 불가한 문자열 `"{bad"`일 때
  - When `getRecords()` 호출
  - Then 빈 객체 `{}` 반환하고 `console.error` 미출력
- AC-7 [U][P1]: Scenario: 상환 예상일 계산
  - Given `totalDebt = 300`, `recoveryRatePerDay = 30`
  - When `getPayoffDays()` 호출
  - Then `10`(일) 반환. `totalDebt = 0`이면 `0` 반환
- AC-8 [U][P0]: 계산 함수는 `NaN`/음수 입력 시 `0`으로 클램프하며 절대 `NaN`을 저장하지 않는다.

---

### F2. 일일 수면 입력
- Description: 취침·기상 시간을 입력해 그날의 수면 기록을 저장하고 즉시 부채를 계산한다. 같은 날짜 재입력 시 덮어쓰기하며, 저장 후 홈 대시보드로 이동한다.
- Data: `SleepRecord`, `UserSettings`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 수면 기록 저장 성공
  - Given 토스 로그인 유저, `targetMinutes = 480`
  - When 입력 폼에서 `{ date: "2026-07-29", bedTime: "23:30", wakeTime: "06:30" }` 제출
  - Then `sdt.records.v1`에 저장되고 TDS Toast "기록이 저장됐어요" 표시, `navigate('/')`
- AC-2 [E][P0]: Scenario: 같은 날짜 덮어쓰기
  - Given `"2026-07-29"` 기록이 이미 존재
  - When 동일 날짜로 다른 시간 제출
  - Then 기존 기록이 갱신되고 중복 항목이 생기지 않음
- AC-3 [W][P1]: Scenario: 미래 날짜 거부
  - Given 오늘이 `2026-07-29`
  - When `date = "2026-08-01"`로 제출
  - Then 에러 메시지 "미래 날짜는 기록할 수 없어요" 표시, 저장 안 됨
- AC-4 [W][P1]: Scenario: 시간 미입력 거부
  - When `bedTime` 또는 `wakeTime`이 빈 값으로 제출
  - Then 에러 메시지 "취침·기상 시간을 모두 입력해주세요" 표시
- AC-5 [W][P1]: Scenario: 비정상 짧은 수면 경고
  - When `computeSleep` 결과 `sleepMinutes < 60`
  - Then AlertDialog "수면 시간이 1시간 미만이에요. 맞나요?" 확인 요청 후에만 저장
- AC-6 [S][P1]: Scenario: 저장 진행 상태
  - While 저장 처리 중일 때
  - Then TDS Button은 loading 상태로 비활성화되어 중복 제출을 막음
- AC-7 [U][P1]: Scenario: 모바일 키보드 대응
  - Given 시간 입력 필드에 포커스
  - Then 하단 제출 버튼이 키보드에 가려지지 않도록 SubmitFooter가 스크롤 영역 위에 유지됨

---

### F3. 수면 부채 대시보드 (홈)
- Description: 누적 수면 부채, 상환 예상일, 오늘 기록 여부, 현재 스트릭을 한 화면에 요약한다. 앱의 핵심 가치 화면으로 부채 수치를 히어로로 강조하고 최근 추이를 시각화한다.
- Data: `SleepRecord`, `UserSettings`, `StreakState`
- API: 없음
- Requirements:
- AC-1 [U][P0]: Scenario: 누적 부채 표시
  - Given records 누적 `debtMinutes` 합이 `300`분
  - When 홈 진입
  - Then `data-testid="debt-hero"` SummaryHero에 CountUp으로 "5h 0m" 표기
- AC-2 [U][P0]: Scenario: 상환 예상일 표시
  - Given `totalDebt = 300`, `recoveryRatePerDay = 30`
  - Then `data-testid="payoff-card"` Card에 "약 10일 후 상환 완료" 표기
- AC-3 [U][P0]: Scenario: 홈 레이아웃 계약
  - When 홈 렌더링
  - Then `data-testid="debt-hero"` SummaryHero 1개, `data-testid="debt-sparkline"` Sparkline(최근 7일 부채 추이) 1개, `data-testid="payoff-card"` Card 1개를 포함하고 각 핵심 값은 t2~t3 강조 타이포로 표기
- AC-4 [S][P1]: Scenario: 오늘 미기록 상태
  - While 오늘 날짜 기록이 없을 때
  - Then "오늘 수면을 기록해보세요" 문구와 display="block" TDS Button "오늘 기록하기"(→ `/input`) 표시
- AC-5 [E][P1]: Scenario: 빈 상태
  - Given records가 0건
  - When 홈 진입
  - Then Asset.ContentIcon + "아직 기록이 없어요. 첫 수면을 기록해보세요" 빈 상태 표시, 차트/부채 카드 숨김
- AC-6 [S][P1]: Scenario: 로딩 상태
  - While localStorage 로드 중일 때
  - Then Skeleton 자리표시자를 노출하고 부채 값 자리에 "—" 표기
- AC-7 [U][P2]: Scenario: 배너 광고 배치
  - Then 콘텐츠 최하단 섹션 아래에 `<AdSlot>` 1개 배치, 부채 히어로/카드와 겹치지 않음

---

### F4. 주간 수면 리포트 (리워드 광고 게이팅)
- Description: 최근 7일 수면 시간·부채를 막대 차트와 요약 지표로 보여준다. 주간 상세 리포트는 리워드 광고 시청 후 공개되며, 같은 주에는 재시청 없이 열람 가능하다.
- Data: `SleepRecord`, `sdt.rewardUnlock.v1`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 리포트 리워드 게이트
  - Given 이번 주(`2026-W31`) 리포트가 아직 미해제
  - When "주간 리포트 보기" 버튼 탭 후 `<TossRewardAd>` 광고 시청 완료
  - Then 리포트 상세가 표시되고 `sdt.rewardUnlock.v1.report = "2026-W31"` 저장
- AC-2 [S][P0]: Scenario: 같은 주 재열람
  - While `sdt.rewardUnlock.v1.report`가 이번 주와 일치할 때
  - Then 광고 없이 리포트 상세를 즉시 표시
- AC-3 [U][P0]: Scenario: 리포트 레이아웃 계약
  - When 리포트 상세 렌더링
  - Then `data-testid="weekly-bars"` MiniBar/막대 차트 1개와 `data-testid="weekly-summary"` Card(주간 총부채·평균 수면 t2 강조)를 포함
- AC-4 [E][P1]: Scenario: 데이터 부족
  - Given 이번 주 기록이 0건
  - When 리포트 화면 진입
  - Then "이번 주 기록이 없어요" 빈 상태(Asset.ContentIcon) 표시, 광고 버튼 숨김
- AC-5 [W][P1]: Scenario: 광고 로드 실패
  - Given `<TossRewardAd>` 로드/시청이 실패할 때
  - When 사용자가 게이트 버튼 탭
  - Then Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요" 표시, 리포트 미해제 유지
- AC-6 [S][P1]: Scenario: 로딩 상태
  - While 주간 데이터 집계 중일 때
  - Then 차트 영역에 Skeleton 표시

---

### F5. 주말 회복 수면 플랜 (리워드 광고 게이팅)
- Description: 현재 누적 부채와 상환율을 바탕으로 토·일 추가 수면 시간과 권장 취침/기상 시각을 규칙 기반으로 계산해 제시한다. 플랜 결과는 리워드 광고 시청 후 공개된다.
- Data: `SleepRecord`, `UserSettings`, `sdt.rewardUnlock.v1`
- API: 없음
- Requirements:
- AC-1 [U][P0]: Scenario: 회복 플랜 계산
  - Given `totalDebt = 300`분, 목표 취침 `23:30`
  - When `buildRecoveryPlan()` 호출
  - Then 토·일 추가 수면 합이 `min(totalDebt, 240)`분 이내로 분배되고 각 요일 권장 취침/기상 시각 반환(1회 몰아자기 상한 하루 120분)
- AC-2 [E][P0]: Scenario: 플랜 리워드 게이트
  - Given 이번 주 플랜 미해제
  - When "회복 플랜 보기" 버튼 탭 후 `<TossRewardAd>` 시청 완료
  - Then `data-testid="plan-card"` Card 2개(토·일)로 플랜 표시, `sdt.rewardUnlock.v1.plan` 저장
- AC-3 [U][P0]: Scenario: 플랜 레이아웃 계약
  - Then 회복 플랜 화면은 `data-testid="plan-card"` Card 2개와 각 카드에 추가 수면 시간(t3 강조)·권장 취침/기상 배지를 포함
- AC-4 [S][P1]: Scenario: 부채 없음 상태
  - While `totalDebt = 0`일 때
  - Then "수면 부채가 없어요! 잘 자고 있어요" 메시지 표시, 광고/플랜 카드 숨김
- AC-5 [W][P1]: Scenario: 광고 실패 시 미공개
  - Given 광고 시청 미완료/실패
  - Then 플랜 상세를 표시하지 않고 Toast "광고 시청 후 플랜을 확인할 수 있어요" 표시
- AC-6 [S][P1]: Scenario: 로딩 상태
  - While 플랜 계산 중일 때
  - Then 버튼 loading 상태로 중복 실행 차단

---

### F6. 연속 기록 스트릭 (일일 체크인)
- Description: 매일 수면을 기록하면 연속 기록 스트릭이 1 증가하고, 하루라도 건너뛰면 1로 리셋된다. 홈과 스트릭 배지로 최고 기록과 현재 연속일을 노출해 매일 재방문을 유도한다.
- Data: `StreakState`, `SleepRecord`
- API: 없음
- Requirements:
- AC-1 [E][P0]: Scenario: 연속 체크인 증가
  - Given `lastCheckInDate = "2026-07-28"`, `currentStreak = 3`, 오늘 `2026-07-29`
  - When 오늘 기록 저장 성공
  - Then `currentStreak = 4`, `lastCheckInDate = "2026-07-29"` 저장
- AC-2 [E][P0]: Scenario: 하루 건너뛰면 리셋
  - Given `lastCheckInDate = "2026-07-27"`, 오늘 `2026-07-29`
  - When 오늘 기록 저장
  - Then `currentStreak = 1`로 리셋
- AC-3 [S][P1]: Scenario: 같은 날 재저장은 유지
  - While `lastCheckInDate`가 오늘과 같을 때
  - When 같은 날 기록을 다시 저장
  - Then `currentStreak` 변동 없음(중복 카운트 방지)
- AC-4 [U][P0]: Scenario: 최고 기록 갱신
  - Given `currentStreak`가 `longestStreak`를 초과
  - Then `longestStreak = currentStreak`로 갱신
- AC-5 [U][P1]: Scenario: 스트릭 배지 표시
  - When 홈 진입
  - Then `data-testid="streak-badge"` Chip에 "🔥 4일 연속" 표기, 0일이면 "기록을 시작해보세요"
- AC-6 [S][P1]: Scenario: 초기 상태
  - While `sdt.streak.v1`이 없을 때
  - Then `currentStreak = 0`, `longestStreak = 0`으로 안전 초기화

---

### F7. 수면 유형 진단 테스트 (아침형/저녁형)
- Description: 5개 문항 규칙 기반 설문으로 아침형/중간형/저녁형을 판정하고 결과를 저장한다. 결과는 유형 배지와 간단한 특징 문구로 제시하며 재검사가 가능하다.
- Data: `ChronotypeResult`
- API: 없음
- Requirements:
- AC-1 [U][P0]: Scenario: 유형 판정 로직
  - Given 5문항 응답 점수 합 `score`(0~100)
  - When `score >= 67` → `MORNING`, `34~66` → `INTERMEDIATE`, `<= 33` → `EVENING`
  - Then 해당 `type`과 `score`를 `sdt.chronotype.v1`에 `answeredAt`과 함께 저장
- AC-2 [E][P0]: Scenario: 진단 완료
  - Given 5문항 모두 응답
  - When "결과 보기" 탭
  - Then `data-testid="chronotype-result"` Card에 유형 배지 + 특징 문구 표시, `navigate` 없이 결과 뷰 전환
- AC-3 [W][P1]: Scenario: 미완료 제출 차단
  - Given 5문항 중 일부만 응답
  - When "결과 보기" 탭
  - Then 에러 "모든 문항에 답해주세요" 표시, 결과 미노출
- AC-4 [S][P1]: Scenario: 기존 결과 재노출
  - While `sdt.chronotype.v1`이 존재할 때
  - When 진단 화면 진입
  - Then 이전 결과 요약 + "다시 검사하기" TDS Button 표시
- AC-5 [E][P1]: Scenario: 재검사
  - When "다시 검사하기" 탭
  - Then 문항이 초기화되고 이전 응답이 남지 않음
- AC-6 [U][P1]: Scenario: 진행 표시
  - While 문항 응답 중일 때
  - Then 상단에 "3 / 5" 진행 표기

---

## Screen Definitions

### S1. 홈 대시보드 — `/`
- **TDS 컴포넌트**: ScreenScaffold, Top, SummaryHero, Sparkline, Card, Chip(스트릭 배지), TDS Button(display="block"), Paragraph.Text, Skeleton, Asset.ContentIcon, AdSlot, FloatingTabBar
- **상태**: Loading(Skeleton) / Empty(기록 0건 → Asset.ContentIcon + CTA) / Error(스토리지 파싱 실패 → 안전 초기화, Toast 없이 빈 상태)
- **터치 인터랙션**: "오늘 기록하기" 버튼 ≥ 44px, 각 카드 탭 시 상세 이동
- **레이아웃 계약**: `data-testid="debt-hero"` SummaryHero + `data-testid="debt-sparkline"` Sparkline + `data-testid="payoff-card"` Card + `data-testid="streak-badge"` Chip. AdSlot은 최하단.
- **네비게이션 계약**:
  - Outgoing: "오늘 기록하기 → `navigate('/input', { state: { date: todayISO } })`"; 리포트 탭 → `navigate('/report')`; 플랜 탭 → `navigate('/plan')`; 진단 탭 → `navigate('/diagnosis')`
  - Incoming: `location.state = { toast?: string }`(저장 후 복귀 시 성공 토스트 표기용) | `undefined`

### S2. 수면 입력 — `/input`
- **TDS 컴포넌트**: ScreenScaffold, Top, TextField(시간 입력, `type` time), ListRow(날짜 선택), TDS Button(SubmitFooter 하단 고정), AlertDialog(비정상 수면 확인), Toast, Spacing
- **상태**: Loading(저장 중 Button loading) / Empty(신규 입력 기본값=목표 기반 프리필) / Error(검증 실패 시 TextField 하단 에러 메시지)
- **키보드**: 시간 입력 포커스 시 SubmitFooter가 키보드 위 유지, 스크롤로 필드 가림 방지
- **터치**: 제출 버튼 display="block" ≥ 44px, 날짜 ListRow ≥ 44px
- **네비게이션 계약**:
  - Outgoing: 저장 성공 → `navigate('/', { state: { toast: '기록이 저장됐어요' } })`
  - Incoming: `location.state = { date: string /* YYYY-MM-DD */ } | undefined`(없으면 오늘 날짜 기본값)

### S3. 주간 리포트 — `/report`
- **TDS 컴포넌트**: ScreenScaffold, Top, TossRewardAd(게이트), 막대차트(MiniBar), Card, Paragraph.Text, Skeleton, Asset.ContentIcon, FloatingTabBar
- **상태**: Loading(Skeleton 차트) / Empty(이번 주 기록 0건) / Error(광고 실패 Toast)
- **터치**: "주간 리포트 보기" 게이트 버튼 ≥ 44px
- **레이아웃 계약**: `data-testid="weekly-bars"` + `data-testid="weekly-summary"` Card
- **네비게이션 계약**:
  - Outgoing: 없음(탭 내 뷰 전환) — 리스트 항목 탭 시 `navigate('/input', { state: { date } })`로 수정 진입
  - Incoming: `location.state = undefined`

### S4. 회복 플랜 — `/plan`
- **TDS 컴포넌트**: ScreenScaffold, Top, TossRewardAd(게이트), Card(요일별), Chip(권장 취침/기상 배지), Paragraph.Text, Asset.ContentIcon, FloatingTabBar
- **상태**: Loading(Button loading) / Empty(부채 0 → 축하 메시지) / Error(광고 실패 Toast)
- **터치**: "회복 플랜 보기" 버튼 ≥ 44px
- **레이아웃 계약**: `data-testid="plan-card"` Card 2개(토·일), 추가 수면 시간 t3 강조
- **네비게이션 계약**: Outgoing 없음(탭 내). Incoming: `location.state = undefined`

### S5. 수면 유형 진단 — `/diagnosis`
- **TDS 컴포넌트**: ScreenScaffold, Top, ListRow(문항 선택지), Chip(진행 표시), TDS Button(display="block"), Card(결과), Spacing
- **상태**: Loading(없음, 로컬 즉시) / Empty(신규 → 문항 1) / Error(미완료 제출 에러)
- **터치**: 선택지 ListRow ≥ 44px, "결과 보기"/"다시 검사하기" 버튼 ≥ 44px
- **레이아웃 계약**: `data-testid="chronotype-result"` Card + 유형 배지
- **네비게이션 계약**: Outgoing 없음(탭 내 뷰 전환). Incoming: `location.state = undefined`

---

## API Contract
외부 API 없음. 모든 데이터는 localStorage 로컬 저장이며 서버 통신·CORS 대상 없음.

---

## Toss 검수 통과 ACs (공통)
- AC-G1 [W][P0]: Scenario: 외부 도메인 이탈 차단 — `window.location.href`/`window.open`으로 외부 URL 이동하는 코드가 존재하지 않는다(법률·공공기관 링크 예외 없음, 앱 자체 미사용).
- AC-G2 [U][P0]: Scenario: 콘솔 에러 0개 — 프로덕션 빌드에서 정상 플로우 및 정의된 에러 케이스 실행 시 `console.error` 출력이 없다.
- AC-G3 [U][P0]: Scenario: HEX 하드코딩 금지 — 소스 전체에 `#RRGGBB` 색상 리터럴이 없고 색상은 TDS 컴포넌트/`var(--tds-color-*)`만 사용, 다크모드에서 텍스트·배경 대비가 유지된다.
- AC-G4 [W][P0]: Scenario: 앱 설치 유도 금지 — "앱 설치", "다운로드" 등 외부 앱 설치 유도 문구/배너/링크가 없다.
- AC-G5 [W][P0]: Scenario: 외부 로깅 금지 — GA/Amplitude 등 외부 분석 SDK를 사용하지 않는다.
- AC-G6 [U][P1]: Scenario: 호환성 — Android 7+/iOS 16+에서 동작, 최신 전용 브라우저 API 미사용.

---

## Assumptions
- 수면 목표 기본값 8시간(480분), 하루 상환 가능량 30분은 초기 default이며 설정에서 조정 가능(설정 화면은 홈 Top 우측 진입 또는 MVP 범위에서 기본값 고정 — 조정 UI는 P2).
- "주"의 기준은 ISO week(월요일 시작), 주 키 포맷 `YYYY-Www`.
- 회복 플랜은 결정론적 규칙(부채·상한 기반)으로 계산하며 개인화 학습/AI 없음.
- 하루 1건 기록(날짜 PK). 낮잠 등 분할 수면은 MVP 미지원.
- 리워드 광고 해제 범위는 "주" 단위로, 주가 바뀌면 재시청 필요.

## Open Questions
- 목표 수면 시간을 사용자가 직접 조정하는 설정 화면을 MVP에 포함할지, default 고정으로 둘지?
- 스트릭 리셋 기준을 "달력 하루 결번"으로 할지, "48시간 무기록"으로 완화할지?
- 초과 수면(음수 부채)을 누적 상쇄에 반영하는 현재 규칙을 유지할지, 당일만 상쇄로 제한할지?
- 진단(F7) 문항 5개의 구체 문항·배점표는 별도 확정 필요(브리핑에 미정).