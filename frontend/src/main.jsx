// 역할: 프론트엔드 시작점. index.html의 #root에 <App />을 그린다.
// BrowserRouter(주소 기능)와 StrictMode로 감싸고, 전체 스타일 styles/global.css를 불러온다.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';

// createRoot: "이 HTML 자리(#root)에 React 화면을 그려라"
createRoot(document.getElementById('root')).render(
  // StrictMode: 개발 중에만 실수를 더 잘 찾도록 검사해 준다 (배포 화면에는 영향 없음)
  <StrictMode>
    {/* BrowserRouter: 주소창의 주소를 읽어서 App 안의 Route가 알맞은 페이지를 고르게 해 준다 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
