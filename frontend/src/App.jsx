// 역할: 주소(URL) ↔ 페이지 연결. 모든 Route는 components/layout/Layout.jsx 안에 들어간다.
//   /                → pages/MainPage (오늘의 메뉴)
//   /menus/:menuId   → pages/MenuDetailPage (평가 작성 + 목록)
//   /ranking         → pages/RankingPage (인기 순위)
//   /guide           → pages/GuidePage (이용 안내)
//   그 밖의 주소     → 없는 페이지 안내 (EmptyState + 홈으로 버튼)
// 담당: 박준호 (다른 사람은 고치기 전에 먼저 말하기)
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import EmptyState from './components/state/EmptyState.jsx';
import Button from './components/ui/Button.jsx';
import MainPage from './pages/MainPage/MainPage.jsx';
import MenuDetailPage from './pages/MenuDetailPage/MenuDetailPage.jsx';
import RankingPage from './pages/RankingPage/RankingPage.jsx';
import GuidePage from './pages/GuidePage/GuidePage.jsx';

// 없는 주소로 들어왔을 때 보여 줄 화면.
// TODO: 김근영이 pages/NotFoundPage/를 만들면 이 함수를 지우고 그 페이지로 바꾼다.
function NotFound() {
  return (
    <EmptyState message="찾는 페이지가 없어요. 주소를 다시 확인해 주세요.">
      <Button to="/">홈으로</Button>
    </EmptyState>
  );
}

export default function App() {
  return (
    <Routes>
      {/* 바깥 Route: 모든 페이지에 공통 틀(헤더 등)을 씌운다.
          안쪽 Route의 페이지는 Layout 안의 <Outlet /> 자리에 들어간다. */}
      <Route element={<Layout />}>
        {/* index: 주소가 정확히 "/"일 때 */}
        <Route index element={<MainPage />} />
        {/* :menuId 는 "바뀌는 값" 자리. /menus/3 이면 menuId = "3" (페이지에서 useParams로 꺼낸다) */}
        <Route path="menus/:menuId" element={<MenuDetailPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="guide" element={<GuidePage />} />
        {/* * : 위 주소에 하나도 안 맞으면 여기로 온다 (404) */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
