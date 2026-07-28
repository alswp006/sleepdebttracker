# Sprint Contract — 라우팅 배선 + FloatingTabBar 연결

## Packet ID: 0011

## Objective
App.tsx의 react-router-dom 라우팅을 FloatingTabBar로 통합하고, 각 페이지가 RouteState 타입으로 location.state를 안전하게 캐스팅하도록 배선한다.

## Deliverables

| File | Change |
|------|--------|
| `src/App.tsx` | FloatingTabBar 컴포넌트를 App 루트에 렌더 (Route 경로와 동기), activeTab 상태 관리 |
| `src/pages/HomePage.tsx` | `useLocation().state as RouteState["/"]` 캐스팅, toast 처리 |
| `src/pages/InputPage.tsx` | `useLocation().state as RouteState["/input"]` 캐스팅 |
| `src/pages/ReportPage.tsx` | `useLocation().state as RouteState["/report"]` 캐스팅 확인 |
| `src/pages/PlanPage.tsx` | `useLocation().state as RouteState["/plan"]` 캐스팅 확인 |
| `src/pages/DiagnosisPage.tsx` | `useLocation().state as RouteState["/diagnosis"]` 캐스팅 확인 |

## Types to Import
- `RouteState` from `@/lib/types` (각 페이지 route path별 state shape 정의)

## Verification
1. `pnpm typecheck` — RouteState 캐스팅 에러 없음
2. `pnpm test src/__tests__/packet-0011.test.ts` — 모든 라우트 네비게이션 테스트 통과
3. 브라우저 dev tools: 각 탭 클릭 → 올바른 경로로 이동 & FloatingTabBar 활성탭 표시 동기화
4. `npx next build` — 빌드 성공

## Absolute Rules
- ❌ `main.tsx` 수정 금지 (@AI:ANCHOR)
- ❌ React Router `<BrowserRouter>` 중첩 금지 (main.tsx가 최상위)
- ✅ FloatingTabBar는 App 루트 또는 _app.tsx에서 렌더 (라우트 변경 시 활성탭 동기화)
- ✅ 각 페이지의 location.state 타입: RouteState[path] 사용 (unknown 캐스팅 금지)
- ✅ location.state 캐스팅 실패 시 안전한 기본값 제공
