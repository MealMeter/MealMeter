"""SQLite 저장소. 서버를 켜면 표가 없을 때 자동으로 만든다."""
import sqlite3
from contextlib import contextmanager

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS menus (
    menu_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    date      TEXT    NOT NULL,          -- YYYY-MM-DD
    meal_code INTEGER NOT NULL,          -- 1 조식 / 2 중식 / 3 석식
    UNIQUE (date, meal_code, name)
);

-- 나이스에서 이미 받아 온 날짜·식사를 기록한다 (급식이 없는 날도 다시 부르지 않도록)
CREATE TABLE IF NOT EXISTS fetched_meals (
    date      TEXT    NOT NULL,
    meal_code INTEGER NOT NULL,
    PRIMARY KEY (date, meal_code)
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_id     INTEGER NOT NULL REFERENCES menus (menu_id),
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    saltiness   TEXT,
    portion     TEXT,
    temperature TEXT,
    texture     TEXT,
    hygiene     TEXT,
    comment     TEXT    NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_menu ON reviews (menu_id);
"""


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect():
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
