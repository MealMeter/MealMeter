"""설정값. 환경 변수(.env)로 바꿀 수 있다."""
import os
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def _load_dotenv() -> None:
    """backend/.env 파일이 있으면 환경 변수로 읽어 온다 (라이브러리 없이 간단하게)."""
    env_file = Path(__file__).resolve().parent.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()

KST = ZoneInfo("Asia/Seoul")

# 대전광역시교육청 / 대덕소프트웨어마이스터고 (명세서 3장 기능 1)
NEIS_URL = "https://open.neis.go.kr/hub/mealServiceDietInfo"
NEIS_OFFICE_CODE = "G10"
NEIS_SCHOOL_CODE = "7430310"
NEIS_API_KEY = os.getenv("NEIS_API_KEY", "")

DB_PATH = os.getenv("MEALMETER_DB_PATH", "mealmeter.db")


def today() -> date:
    """한국 시간 기준 오늘. MEALMETER_TODAY가 있으면 그 날짜를 쓴다 (시연용)."""
    fixed = os.getenv("MEALMETER_TODAY", "")
    if fixed:
        return date.fromisoformat(fixed)
    return datetime.now(KST).date()
