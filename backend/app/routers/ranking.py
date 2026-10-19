"""역할: 순위 API — 4. 인기 순위 조회 (GET /api/ranking). 같은 이름 메뉴를 합쳐 평균 별점 높은 순으로 정렬한다."""
from collections import defaultdict

from fastapi import APIRouter

from ..database import connect
from ..schemas import RankingItem
from ..stats import average, top_tags

router = APIRouter(prefix="/api/ranking", tags=["ranking"])


@router.get("", response_model=list[RankingItem])
def get_ranking():
    with connect() as conn:
        rows = conn.execute(
            "SELECT m.name, r.* FROM reviews r JOIN menus m ON m.menu_id = r.menu_id"
        ).fetchall()

    # 메뉴 이름 기준으로 모은다 (다른 날 나온 같은 메뉴는 하나로 합침)
    by_name = defaultdict(list)
    for row in rows:
        by_name[row["name"]].append(dict(row))

    items = [
        {
            "name": name,
            "average_rating": average([review["rating"] for review in reviews]),
            "review_count": len(reviews),
            "top_tags": top_tags(reviews),
        }
        for name, reviews in by_name.items()
    ]
    # TODO(팀 회의): 평가 수가 적은 메뉴 처리 방식이 정해지면 정렬·표시를 바꾼다.
    items.sort(key=lambda item: item["average_rating"], reverse=True)
    return [{"rank": index + 1, **item} for index, item in enumerate(items)]
