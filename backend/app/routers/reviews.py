"""3. 평가 등록"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..database import connect
from ..rules import COMMENT_MAX_LENGTH, TAG_FIELDS, has_banned_word
from ..schemas import Review, ReviewCreate

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.post("", response_model=Review, status_code=201)
def create_review(body: ReviewCreate):
    if body.rating is None or not 1 <= body.rating <= 5:
        raise HTTPException(400, "별점은 1점부터 5점까지 골라 주세요.")

    for key, (label, options) in TAG_FIELDS.items():
        value = getattr(body, key)
        if value is not None and value not in options:
            raise HTTPException(400, f"{label} 항목은 {' / '.join(options)} 중에서 골라 주세요.")

    comment = (body.comment or "").strip()
    if len(comment) > COMMENT_MAX_LENGTH:
        raise HTTPException(400, f"의견은 {COMMENT_MAX_LENGTH}자까지 쓸 수 있어요.")
    if has_banned_word(comment):
        raise HTTPException(400, "욕설이나 비방 표현은 등록할 수 없어요.")

    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with connect() as conn:
        if conn.execute("SELECT 1 FROM menus WHERE menu_id = ?", (body.menu_id,)).fetchone() is None:
            raise HTTPException(404, "없는 메뉴예요.")
        cursor = conn.execute(
            """
            INSERT INTO reviews
                (menu_id, rating, saltiness, portion, temperature, texture, hygiene, comment, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.menu_id, body.rating, body.saltiness, body.portion, body.temperature,
                body.texture, body.hygiene, comment, created_at,
            ),
        )
        saved = conn.execute("SELECT * FROM reviews WHERE review_id = ?", (cursor.lastrowid,)).fetchone()
    return dict(saved)
