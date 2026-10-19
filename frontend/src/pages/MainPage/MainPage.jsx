// 메인 (오늘의 메뉴) — 명세서 3장 기능 1. 담당: 김태건
import { getTodayMenus } from '../../api/index.js';
import { useApi } from '../../api/useApi.js';
import Loading from '../../components/state/Loading.jsx';
import ErrorMessage from '../../components/state/ErrorMessage.jsx';
import EmptyState from '../../components/state/EmptyState.jsx';
import MenuCard from './MenuCard.jsx';
import './MainPage.css';

function formatKoreanDate(isoDate) {
  const [, month, day] = isoDate.split('-').map(Number);
  return `${month}월 ${day}일`;
}

export default function MainPage() {
  const { data, loading, error, reload } = useApi(() => getTodayMenus(), []);

  return (
    <section className="main-page">
      <h1>오늘 급식, 어땠나요?</h1>
      <p className="muted">한 끼의 솔직한 평가가 내일의 메뉴를 바꿔요. 이름 없이 의견을 남겨 보세요.</p>

      {loading && <Loading message="오늘의 메뉴를 불러오는 중이에요…" />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {data && !loading && (
        <>
          <h2>
            오늘의 메뉴 · {formatKoreanDate(data.date)} {data.mealType}
          </h2>
          {data.menus.length === 0 ? (
            <EmptyState message="오늘은 급식 정보가 없어요" />
          ) : (
            <ul className="main-page__menus">
              {data.menus.map((menu) => (
                <MenuCard key={menu.menuId} menu={menu} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
