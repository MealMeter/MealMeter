// 모든 페이지를 감싸는 공통 틀. 담당: 박준호
// 페이지 내용은 <Outlet /> 자리에 들어간다 (App.jsx의 Route 참고).
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import './Layout.css';

export default function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">
        본문으로 건너뛰기
      </a>
      <Header />
      <main id="main" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>MealMeter · 이름 없이 남기는 급식 평가</p>
      </footer>
    </>
  );
}
