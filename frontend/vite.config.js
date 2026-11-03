// 역할: Vite(개발 서버·빌드 도구) 설정. 담당: 김근영
// React 없이 HTML 파일 여러 개(페이지마다 하나)를 그대로 쓰는 "여러 페이지(mpa)" 방식이다.
// /api 요청은 백엔드(MealMeter-BE, localhost:8080)로 넘긴다.
// [문법] import { 이름 } from '패키지이름': node_modules에 설치된 패키지에서 가져온다(경로가 ./ 로 시작하지 않음)
import { defineConfig } from 'vite';

// 페이지 목록. 새 페이지(HTML)를 만들면 여기에도 이름을 추가해야 npm run build 결과에 들어간다.
// [문법] 문자열 배열. 빌드할 HTML 이름 목록
const PAGES = ['index', 'menu', 'ranking'];

// 프로젝트 폴더 안의 파일 경로를 만든다 (예: file('index.html'))
// [문법] 화살표 함수를 변수에 담았다. new URL(상대경로, 기준): 기준 주소에서 상대경로를 계산한 URL 객체
// [문법] import.meta.url: 지금 이 파일(vite.config.js)의 주소
const file = (name) => new URL(`./${name}`, import.meta.url);

// [문법] export default: 이 파일의 '대표 값' 하나를 내보낸다. Vite가 이 설정 객체를 읽는다
// [문법] defineConfig(객체): 그냥 객체를 돌려주지만, 편집기가 설정 이름을 자동 완성해 준다
export default defineConfig({
  appType: 'mpa', // 여러 페이지 방식 (모르는 주소를 index.html로 돌리지 않는다)
  server: {
    // /api로 시작하는 요청은 백엔드 서버로 넘긴다 (주소가 달라서 막히는 CORS 문제 피하기)
    proxy: {
      // [문법] 키에 / 같은 기호가 있으면 따옴표로 감싼다. /api로 시작하는 요청을 이 주소로 넘긴다(proxy)
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    rollupOptions: {
      // [문법] PAGES.map으로 [이름, 파일경로] 쌍을 만들고 Object.fromEntries로 { index: '.../index.html', ... } 객체로
      // [문법] .pathname: URL 객체에서 경로 부분만 꺼낸다
      input: Object.fromEntries(PAGES.map((name) => [name, file(`${name}.html`).pathname])),
    },
  },
});
