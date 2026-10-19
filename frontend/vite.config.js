import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // /api로 시작하는 요청은 Spring 서버로 넘긴다 (CORS 문제 피하기)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
