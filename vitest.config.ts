import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    // react-router(-dom)은 조건부 export로 CJS(index.js)와 ESM(index.mjs)이 갈린다. vitest가
    // 파일마다 다른 빌드를 물어오면 Router 컨텍스트 인스턴스가 둘로 쪼개져(테스트의 MemoryRouter와
    // 컴포넌트의 useLocation이 서로 다른 컨텍스트를 봄) 실제 라우팅/활성 탭 테스트가 조용히 깨진다.
    // 세 specifier를 모두 ESM 빌드 하나로 고정해 단일 인스턴스(단일 LocationContext)를 보장한다.
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: /^react-router-dom$/,
        replacement: path.resolve(__dirname, './node_modules/react-router/dist/development/index.mjs'),
      },
      {
        find: /^react-router$/,
        replacement: path.resolve(__dirname, './node_modules/react-router/dist/development/index.mjs'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Playwright 비주얼 스펙은 e2e/에 있다 — vitest 실행에서 제외(기본 제외 + e2e).
    // scripts/__tests__는 node:test용(node --test로 실행) — vitest globals와 충돌해 collect 불가.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**', 'scripts/__tests__/**'],
    // 워커 폭발 방지(실사고 2026-07-21 global OOM/exit 137): vitest 기본은 CPU 코어 수만큼
    // 포크를 띄운다(16스레드 머신=최대 16개, 각 수백 MB) → jsdom 로드까지 겹쳐 WSL 총 메모리
    // 소진. 미니앱은 테스트 파일이 3~5개라 2포크로 충분하고 메모리를 8배 이상 줄인다.
    pool: 'forks',
    poolOptions: { forks: { minForks: 1, maxForks: 2 } },
    // 위 alias(ESM 고정)와 짝: .mjs 내부의 react-router(/dom) bare import까지 vite가 변환·alias
    // 적용하도록 inline → node 외부화 경로로 새는 두 번째 인스턴스 차단(단일 LocationContext).
    server: { deps: { inline: true } },
  },
});
