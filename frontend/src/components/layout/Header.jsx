// 공통 헤더 + 내비게이션. 담당: 박준호
// NavLink는 지금 페이지 링크에 aria-current="page"를 자동으로 붙인다.
import { Link, NavLink } from 'react-router-dom';
import './Layout.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="site-header__logo">
          MealMeter
        </Link>
        <nav aria-label="주요 메뉴" className="site-header__nav">
          <NavLink to="/" end>
            오늘의 메뉴
          </NavLink>
          <NavLink to="/ranking">인기 순위</NavLink>
          <NavLink to="/guide">이용 안내</NavLink>
        </nav>
      </div>
    </header>
  );
}
