import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import HomePage from './pages/HomePage';
import InputPage from './pages/InputPage';
import ReportPage from './pages/ReportPage';
import PlanPage from './pages/PlanPage';
import DiagnosisPage from './pages/DiagnosisPage';
import OnboardingNotice from './components/OnboardingNotice';
import { FloatingTabBar } from './components/FloatingTabBar';

// 하단 탭 네비 항목 — 라우트 밖에서 1회만 렌더한다(페이지마다 중복 렌더 금지).
const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '리포트', path: '/report' },
  { label: '플랜', path: '/plan' },
  { label: '진단', path: '/diagnosis' },
];
// 폼 화면(/input)은 하단 SubmitFooter와 겹치므로 탭바를 숨긴다.
const TAB_ROUTES = new Set(TAB_ITEMS.map((t) => t.path));

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  const showTabBar = TAB_ROUTES.has(useLocation().pathname);

  return (
    <>
      <OnboardingNotice />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/input" element={<InputPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/diagnosis" element={<DiagnosisPage />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
      </Routes>
      {showTabBar && <FloatingTabBar items={TAB_ITEMS} />}
    </>
  );
}
