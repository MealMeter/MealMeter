// 주소 ↔ 페이지 연결. 담당: 박준호 (다른 사람은 고치기 전에 먼저 말하기)
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import MainPage from './pages/MainPage/MainPage.jsx';
import MenuDetailPage from './pages/MenuDetailPage/MenuDetailPage.jsx';
import RankingPage from './pages/RankingPage/RankingPage.jsx';
import GuidePage from './pages/GuidePage/GuidePage.jsx';
import EmptyState from './components/state/EmptyState.jsx';
import Button from './components/ui/Button.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/menus/:menuId" element={<MenuDetailPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route
          path="*"
          element={
            <EmptyState message="없는 페이지예요.">
              <Button to="/">오늘의 메뉴로</Button>
            </EmptyState>
          }
        />
      </Route>
    </Routes>
  );
}
