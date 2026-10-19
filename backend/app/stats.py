"""역할: 평균 별점·대표 태그 집계 도우미 (메뉴 상세와 인기 순위에서 같이 쓴다)."""
from collections import Counter
from typing import Dict, Iterable, List

from .rules import HYGIENE_PROBLEM, TAG_FIELDS


def average(ratings: List[int]) -> float:
    if not ratings:
        return 0.0
    return round(sum(ratings) / len(ratings), 1)


def top_tags(reviews: Iterable[Dict]) -> List[Dict[str, str]]:
    """항목마다 가장 많이 고른 값을 하나씩. 위생은 '문제 있음'일 때만 넣는다."""
    reviews = list(reviews)
    result = []
    for key, (label, _options) in TAG_FIELDS.items():
        counts = Counter(review[key] for review in reviews if review[key])
        if not counts:
            continue
        value = counts.most_common(1)[0][0]
        if key == "hygiene" and value != HYGIENE_PROBLEM:
            continue
        result.append({"category": label, "value": value})
    return result
