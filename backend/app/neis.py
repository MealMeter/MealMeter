"""역할: 나이스 급식 API에서 그날 메뉴 이름 목록을 가져온다 (알레르기 번호·특수 표시는 지운다)."""
import re
from datetime import date
from typing import List

import httpx

from . import config


class NeisError(Exception):
    """나이스 서버에 연결하지 못했거나 이상한 응답이 왔을 때."""


# "닭갈비 (1.2.5.)" → "닭갈비". 괄호 안 숫자는 알레르기 정보, *·# 등은 학교별 표시.
_ALLERGY = re.compile(r"\s*\([\d.\s]*\)")
_MARKS = re.compile(r"[*#&@]+")


def clean_dish_name(raw: str) -> str:
    name = _ALLERGY.sub("", raw)
    name = _MARKS.sub("", name)
    return name.strip()


def parse_dishes(payload: dict) -> List[str]:
    """나이스 응답(JSON)에서 메뉴 이름만 뽑는다. 급식 정보가 없으면 빈 목록."""
    if "mealServiceDietInfo" not in payload:
        # 데이터가 없으면 {"RESULT": {"CODE": "INFO-200", ...}} 형태로 온다
        code = payload.get("RESULT", {}).get("CODE")
        if code == "INFO-200":
            return []
        raise NeisError(f"나이스 응답 오류: {code}")

    rows = payload["mealServiceDietInfo"][1]["row"]
    names: List[str] = []
    for row in rows:
        for raw in row["DDISH_NM"].split("<br/>"):
            name = clean_dish_name(raw)
            if name and name not in names:
                names.append(name)
    return names


def fetch_dishes(day: date, meal_code: int) -> List[str]:
    params = {
        "Type": "json",
        "ATPT_OFCDC_SC_CODE": config.NEIS_OFFICE_CODE,
        "SD_SCHUL_CODE": config.NEIS_SCHOOL_CODE,
        "MLSV_YMD": day.strftime("%Y%m%d"),
        "MMEAL_SC_CODE": meal_code,
    }
    if config.NEIS_API_KEY:
        params["KEY"] = config.NEIS_API_KEY
    try:
        response = httpx.get(config.NEIS_URL, params=params, timeout=5)
        response.raise_for_status()
        return parse_dishes(response.json())
    except (httpx.HTTPError, ValueError, KeyError, IndexError) as error:
        raise NeisError(str(error)) from error
