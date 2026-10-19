// 역할: Vite(개발 서버·빌드 도구) 설정. React 플러그인을 켜고 /api 요청을 백엔드로 넘긴다.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // /api로 시작하는 요청은 FastAPI 서버(backend/)로 넘긴다 (CORS 문제 피하기)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
