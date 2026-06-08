import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

const gitHash = (() => {
  // Vercel 환경: VERCEL_GIT_COMMIT_SHA 우선 사용
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return String(Date.now()); }
})();

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // git 커밋 해시를 파일명에 포함 → 배포마다 새 URL → 브라우저 캐시 자동 무효화
        entryFileNames: `assets/app.${gitHash}.js`,
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return `assets/style.${gitHash}.css`
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
