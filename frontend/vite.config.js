// 역할: Vite(개발 서버·빌드 도구) 설정. 담당: 박준호
// React 없이 HTML 파일 여러 개(페이지마다 하나)를 그대로 쓰는 "여러 페이지(mpa)" 방식이다.
// /api 요청은 백엔드(MealMeter-BE, localhost:8080)로 넘기고, 없는 주소에는 404.html을 보여 준다.
import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// 페이지 목록. 새 페이지(HTML)를 만들면 여기에도 이름을 추가해야 npm run build 결과에 들어간다.
const PAGES = ['index', 'menu', 'ranking', 'guide', '404'];

// 프로젝트 폴더 안의 파일 경로를 만든다 (예: file('404.html'))
const file = (name) => new URL(`./${name}`, import.meta.url);

// 개발 서버에서 없는 주소(예: /abc)로 들어오면 404.html을 보여 주는 작은 플러그인
function notFoundPage() {
  return {
    name: 'mealmeter-not-found',
    configureServer(server) {
      // 함수를 return하면 Vite가 파일을 찾아본 "뒤에" 실행된다
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const path = req.url.split('?')[0];
          const wantsHtml = (req.headers.accept || '').includes('text/html');
          // 진짜 있는 HTML 페이지이거나, 페이지 요청이 아니면(이미지 등) 그냥 넘긴다
          if (!wantsHtml || (path.endsWith('.html') && existsSync(file(path.slice(1))))) return next();

          const html = readFileSync(file('404.html'), 'utf-8');
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(await server.transformIndexHtml(req.url, html));
        });
      };
    },
  };
}

export default defineConfig({
  appType: 'mpa', // 여러 페이지 방식 (모르는 주소를 index.html로 돌리지 않는다)
  plugins: [notFoundPage()],
  server: {
    // /api로 시작하는 요청은 백엔드 서버로 넘긴다 (주소가 달라서 막히는 CORS 문제 피하기)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((name) => [name, file(`${name}.html`).pathname])),
    },
  },
});
