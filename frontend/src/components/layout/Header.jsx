// 역할: 모든 페이지 위에 나오는 공통 헤더 + 내비게이션 (로고, 오늘의 메뉴 / 인기 순위 / 이용 안내 링크).
// NavLink는 지금 페이지 링크에 aria-current="page"를 자동으로 붙인다.
// 담당: 박준호
import { Link, NavLink } from 'react-router-dom';

// 메뉴 링크 목록. 주소는 App.jsx의 Route와 같아야 한다.
const NAV_ITEMS = [
  { to: '/', label: '오늘의 메뉴' },
  { to: '/ranking', label: '인기 순위' },
  { to: '/guide', label: '이용 안내' },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        {/* 로고를 누르면 메인으로 간다 */}
        <Link to="/" className="site-header__logo">
          MealMeter
        </Link>

        {/* aria-label: 화면 낭독기가 "주요 메뉴 내비게이션"이라고 읽어 준다 */}
        <nav aria-label="주요 메뉴">
          <ul className="site-header__nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                {/* end: "/"는 모든 주소의 앞부분이라, end가 없으면 어느 페이지에서나 "오늘의 메뉴"가 선택된 것처럼 보인다.
                    end를 주면 주소가 정확히 같을 때만 선택 표시가 된다. */}
                <NavLink to={item.to} end className="site-header__link">
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
