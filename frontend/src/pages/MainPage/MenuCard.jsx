// 역할: 메뉴 카드 하나 (메뉴 이름 + 평균 별점 + 평가 수 + "평가하기" 버튼 → /menus/:menuId). 담당: 김태건
// <MenuCard menu={menu} />  props: menu({ menuId, name, averageRating, reviewCount })

import Card from "./ui/Card";           // ← 경로 확인
import StarRating from "./ui/StarRating";
import Button from "./ui/Button";

export default function MenuCard({ menu }) {
  const { menuId, name, averageRating, reviewCount } = menu;

  return (
    <Card as="li" className="menu-card">
      <h3 className="menu-card__name">{name}</h3>

      <div className="menu-card__rating">
        {reviewCount > 0 ? (
          <>
            <StarRating value={averageRating} />
            <span className="muted small">{reviewCount}명</span>
          </>
        ) : (
          <span className="muted small">아직 평가가 없어요</span>
        )}
      </div>

      <Button to={`/menus/${menuId}`}>평가하기</Button>
    </Card>
  );
}