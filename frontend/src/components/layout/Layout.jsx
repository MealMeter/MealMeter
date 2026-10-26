// 역할: 모든 페이지를 감싸는 공통 틀 (본문 건너뛰기 링크 + Header + 본문 + 푸터).
// 페이지 내용은 <Outlet /> 자리에 들어간다 (App.jsx의 Route 참고).
// 담당: 박준호
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import './Layout.css';

export default function Layout() {
  return (
    <div className="site">
      {/* 본문 건너뛰기 링크 (접근성): 키보드 사용자가 Tab을 처음 누르면 나타나고,
          누르면 헤더 메뉴를 건너뛰고 바로 본문(#main)으로 간다. 평소에는 화면 밖에 숨어 있다. */}
      <a className="skip-link" href="#main">
        본문 바로가기
      </a>

      <Header />

      {/* tabIndex={-1}: 건너뛰기 링크로 왔을 때 본문에 포커스가 갈 수 있게 한다 (Tab 순서에는 안 들어감) */}
      <main id="main" className="site-main" tabIndex={-1}>
        {/* 지금 주소에 맞는 페이지가 이 자리에 그려진다 */}
        <Outlet />
      </main>

      <footer className="site-footer">
        <p>MealMeter · 이름 없이 남긴 평가로 더 나은 급식을 만들어요</p>
      </footer>
    </div>
  );
}
