import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import HomePage from './pages/HomePage';
import InputPage from './pages/InputPage';
import ReportPage from './pages/ReportPage';
import PlanPage from './pages/PlanPage';
import DiagnosisPage from './pages/DiagnosisPage';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

export default function App() {
  return (
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
  );
}
