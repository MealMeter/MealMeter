"""평가 규칙 (명세서 3장 기능 2, 4장). 프론트엔드 src/api/reviewFields.js와 값을 맞춘다."""

# 서버 필드 이름 → (화면 이름, 고를 수 있는 값)
TAG_FIELDS = {
    "saltiness": ("간", ["짜다", "적당", "싱겁다"]),
    "portion": ("양", ["많다", "적당", "적다"]),
    "temperature": ("온도", ["뜨겁다", "적당", "차갑다"]),
    "texture": ("식감", ["무름", "적당", "딱딱"]),
    "hygiene": ("위생", ["문제 있음", "없음"]),
}
HYGIENE_PROBLEM = "문제 있음"

COMMENT_MAX_LENGTH = 100

MEAL_TYPES = {1: "조식", 2: "중식", 3: "석식"}
DEFAULT_MEAL_CODE = 2

# 단순 포함 검사라서 우회 표기(초성, 띄어쓰기)는 못 거른다. 1차 방어선.
BANNED_WORDS = [
    "바보", "멍청이", "씨발", "시발", "병신", "개새끼", "좆",
    "섹스", "성관계", "자위", "자지", "보지", "음란", "꼴린다",
]


def has_banned_word(text: str) -> bool:
    return any(word in text for word in BANNED_WORDS)
