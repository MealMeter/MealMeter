// 역할: 메뉴 상세 페이지 (/menus/:menuId) — 평가 작성 + 평가 목록 (명세서 3장 기능 2). 담당: 박준호
// getMenuReviews(menuId)로 메뉴 정보와 평가를 불러오고,
// ReviewForm에서 새 평가가 등록되면 목록과 평균을 바로 갱신한다.
import { useParams } from 'react-router-dom';
import { getMenuReviews } from '../../api/index.js';
import { useApi } from '../../api/useApi.js';
import EmptyState from '../../components/state/EmptyState.jsx';
import ErrorMessage from '../../components/state/ErrorMessage.jsx';
import Loading from '../../components/state/Loading.jsx';
import Button from '../../components/ui/Button.jsx';
import StarRating from '../../components/ui/StarRating.jsx';
import ReviewForm from './ReviewForm.jsx';
import ReviewList from './ReviewList.jsx';
import './MenuDetailPage.css';

// 평균 별점을 소수 첫째 자리까지 계산한다 (가짜 서버 mock.js와 같은 방식)
function averageOf(reviews) {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

export default function MenuDetailPage() {
  // 주소 /menus/3 에서 "3"을 꺼낸다 (App.jsx의 path="menus/:menuId")
  const { menuId } = useParams();

  // 서버에서 메뉴 정보 + 평가 목록을 불러온다. [menuId]: 메뉴 번호가 바뀌면 다시 불러온다
  const { data, loading, error, setData, reload } = useApi(() => getMenuReviews(menuId), [menuId]);

  // 새 평가가 등록되면: 서버에 다시 묻지 않고, 받은 평가를 목록 맨 앞에 넣고 평균·개수를 다시 계산한다
  function handleCreated(review) {
    setData((prev) => {
      const reviews = [review, ...prev.reviews];
      return { ...prev, reviews, reviewCount: reviews.length, averageRating: averageOf(reviews) };
    });
  }

  // ---- 상태별 화면 (불러오는 중 → 오류 → 정상) ----
  if (loading) return <Loading message="평가를 불러오는 중이에요" />;

  if (error) {
    return (
      <div className="menu-detail">
        {/* onRetry를 넘기면 "다시 시도" 버튼이 생긴다 */}
        <ErrorMessage message={error} onRetry={reload} />
        <p className="menu-detail__back">
          <Button to="/" variant="secondary">
            오늘의 메뉴로 돌아가기
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div className="menu-detail">
      {/* 메뉴 이름과 지금까지의 평가 요약 */}
      <header className="menu-detail__header">
        <p className="menu-detail__date muted">{data.date}</p>
        <h1 className="menu-detail__title">{data.name}</h1>
        {data.reviewCount > 0 ? (
          <p className="menu-detail__summary">
            <StarRating value={data.averageRating} />
            <span className="muted">평가 {data.reviewCount}개</span>
          </p>
        ) : (
          <p className="menu-detail__summary muted">아직 평가가 없어요</p>
        )}
      </header>

      {/* aria-labelledby: 이 구역의 이름을 아래 h2 글자로 정한다 (화면 낭독기가 구역 이름을 읽음) */}
      <section className="menu-detail__section" aria-labelledby="menu-detail-form-title">
        <h2 id="menu-detail-form-title" className="menu-detail__heading">
          평가 남기기
        </h2>
        <ReviewForm menuId={data.menuId} onCreated={handleCreated} />
      </section>

      <section className="menu-detail__section" aria-labelledby="menu-detail-list-title">
        <h2 id="menu-detail-list-title" className="menu-detail__heading">
          평가 목록
        </h2>
        {data.reviews.length === 0 ? (
          <EmptyState message="아직 평가가 없어요. 첫 평가를 남겨 보세요" />
        ) : (
          <ReviewList reviews={data.reviews} />
        )}
      </section>
    </div>
  );
}
