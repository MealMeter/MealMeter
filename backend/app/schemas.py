"""화면과 주고받는 값의 모양 (명세서 5장). JSON 키는 camelCase로 나간다 (menu_id → menuId)."""
from typing import List, Optional

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# 1. 오늘의 메뉴
class MenuSummary(CamelModel):
    menu_id: int
    name: str
    average_rating: float
    review_count: int


class TodayMenus(CamelModel):
    date: str
    meal_type: str
    menus: List[MenuSummary]


# 2·3. 평가
class Review(CamelModel):
    review_id: int
    menu_id: int
    rating: int
    saltiness: Optional[str] = None
    portion: Optional[str] = None
    temperature: Optional[str] = None
    texture: Optional[str] = None
    hygiene: Optional[str] = None
    comment: str = ""
    created_at: str


class MenuReviews(CamelModel):
    menu_id: int
    name: str
    date: str
    average_rating: float
    review_count: int
    reviews: List[Review]


class ReviewCreate(CamelModel):
    """별점 범위·태그 값·금칙어 검사는 routers/reviews.py에서 한국어 메시지와 함께 한다."""

    menu_id: int
    rating: Optional[int] = None
    saltiness: Optional[str] = None
    portion: Optional[str] = None
    temperature: Optional[str] = None
    texture: Optional[str] = None
    hygiene: Optional[str] = None
    comment: Optional[str] = ""


# 4. 인기 순위
class TopTag(CamelModel):
    category: str
    value: str


class RankingItem(CamelModel):
    rank: int
    name: str
    average_rating: float
    review_count: int
    top_tags: List[TopTag]
