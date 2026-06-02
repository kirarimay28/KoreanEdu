import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Rolldown(Vite 8) hash가 코드 변경에도 바뀌지 않는 버그 대응:
        // 메인 번들과 CSS를 고정 파일명으로 출력하고 vercel.json에서 no-cache 설정
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/style.css'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
