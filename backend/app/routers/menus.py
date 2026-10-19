"""1. 오늘의 메뉴 조회 / 2. 메뉴별 평가 목록 조회"""
from datetime import date

from fastapi import APIRouter, HTTPException, Query

from .. import config, neis
from ..database import connect
from ..rules import DEFAULT_MEAL_CODE, MEAL_TYPES
from ..schemas import MenuReviews, TodayMenus
from ..stats import average

router = APIRouter(prefix="/api/menus", tags=["menus"])


def ensure_menus(day: date, meal_code: int) -> None:
    """그날 메뉴가 DB에 없으면 나이스에서 가져와 저장한다."""
    day_text = day.isoformat()
    with connect() as conn:
        fetched = conn.execute(
            "SELECT 1 FROM fetched_meals WHERE date = ? AND meal_code = ?", (day_text, meal_code)
        ).fetchone()
    if fetched:
        return

    try:
        dishes = neis.fetch_dishes(day, meal_code)
    except neis.NeisError:
        raise HTTPException(502, "급식 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.")

    # 아직 나이스에 안 올라온 경우를 위해, 메뉴가 있을 때만 "가져왔음"으로 기록한다.
    if not dishes:
        return
    with connect() as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO menus (name, date, meal_code) VALUES (?, ?, ?)",
            [(name, day_text, meal_code) for name in dishes],
        )
        conn.execute(
            "INSERT OR IGNORE INTO fetched_meals (date, meal_code) VALUES (?, ?)", (day_text, meal_code)
        )


@router.get("/today", response_model=TodayMenus)
def get_today_menus(meal_code: int = Query(DEFAULT_MEAL_CODE, alias="mealCode")):
    if meal_code not in MEAL_TYPES:
        raise HTTPException(400, "식사 구분은 1(조식), 2(중식), 3(석식) 중 하나예요.")

    day = config.today()
    ensure_menus(day, meal_code)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT m.menu_id, m.name,
                   COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
                   COUNT(r.review_id) AS review_count
            FROM menus m
            LEFT JOIN reviews r ON r.menu_id = m.menu_id
            WHERE m.date = ? AND m.meal_code = ?
            GROUP BY m.menu_id
            ORDER BY m.menu_id
            """,
            (day.isoformat(), meal_code),
        ).fetchall()

    return {
        "date": day.isoformat(),
        "meal_type": MEAL_TYPES[meal_code],
        "menus": [dict(row) for row in rows],
    }


@router.get("/{menu_id}/reviews", response_model=MenuReviews)
def get_menu_reviews(menu_id: int):
    with connect() as conn:
        menu = conn.execute("SELECT * FROM menus WHERE menu_id = ?", (menu_id,)).fetchone()
        if menu is None:
            raise HTTPException(404, "없는 메뉴예요.")
        reviews = conn.execute(
            "SELECT * FROM reviews WHERE menu_id = ? ORDER BY review_id DESC", (menu_id,)
        ).fetchall()

    reviews = [dict(row) for row in reviews]
    return {
        "menu_id": menu["menu_id"],
        "name": menu["name"],
        "date": menu["date"],
        "average_rating": average([review["rating"] for review in reviews]),
        "review_count": len(reviews),
        "reviews": reviews,
    }
