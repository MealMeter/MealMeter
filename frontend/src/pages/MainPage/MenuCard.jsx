// 메뉴 카드 (평균 별점 + 평가 수 + 평가하기 버튼). 담당: 김태건
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import StarRating from '../../components/ui/StarRating.jsx';

export default function MenuCard({ menu }) {
  const hasReviews = menu.reviewCount > 0;
  return (
    <Card as="li" className="menu-card">
      <h3>{menu.name}</h3>
      {hasReviews ? (
        <p>
          <StarRating value={menu.averageRating} />{' '}
          <span className="muted">(평가 {menu.reviewCount}개)</span>
        </p>
      ) : (
        <p className="muted">아직 평가가 없어요. 첫 평가를 남겨 보세요</p>
      )}
      <Button to={`/menus/${menu.menuId}`} aria-label={`${menu.name} 평가하기`}>
        평가하기
      </Button>
    </Card>
  );
}
