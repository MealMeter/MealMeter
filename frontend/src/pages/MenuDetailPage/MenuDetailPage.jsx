// 메뉴 상세 (평가 작성 + 평가 목록) — 명세서 3장 기능 2. 담당: 박준호
import { useParams } from 'react-router-dom';
import { getMenuReviews } from '../../api/index.js';
import { useApi } from '../../api/useApi.js';
import Loading from '../../components/state/Loading.jsx';
import ErrorMessage from '../../components/state/ErrorMessage.jsx';
import Button from '../../components/ui/Button.jsx';
import StarRating from '../../components/ui/StarRating.jsx';
import ReviewForm from './ReviewForm.jsx';
import ReviewList from './ReviewList.jsx';
import './MenuDetailPage.css';

export default function MenuDetailPage() {
  const { menuId } = useParams();
  const { data, loading, error, setData, reload } = useApi(() => getMenuReviews(menuId), [menuId]);

  // 등록한 평가를 새로고침 없이 목록 맨 위에 붙이고 평균·개수도 다시 계산한다.
  function handleCreated(review) {
    setData((prev) => {
      const reviewCount = prev.reviewCount + 1;
      const total = prev.averageRating * prev.reviewCount + review.rating;
      return {
        ...prev,
        reviewCount,
        averageRating: Math.round((total / reviewCount) * 10) / 10,
        reviews: [review, ...prev.reviews],
      };
    });
  }

  if (loading) return <Loading message="메뉴 정보를 불러오는 중이에요…" />;
  if (error) {
    return (
      <>
        <ErrorMessage message={error} onRetry={reload} />
        <Button to="/" variant="secondary">
          오늘의 메뉴로
        </Button>
      </>
    );
  }

  return (
    <div className="menu-detail">
      <Button to="/" variant="secondary">
        ← 오늘의 메뉴로
      </Button>

      <section className="menu-detail__summary" aria-labelledby="menu-name">
        <h1 id="menu-name">{data.name}</h1>
        {data.reviewCount > 0 ? (
          <p>
            <StarRating value={data.averageRating} />{' '}
            <span className="muted">(평가 {data.reviewCount}개)</span>
          </p>
        ) : (
          <p className="muted">아직 평가가 없어요. 첫 평가를 남겨 보세요</p>
        )}
      </section>

      <ReviewForm menuId={data.menuId} onCreated={handleCreated} />
      <ReviewList reviews={data.reviews} />
    </div>
  );
}
