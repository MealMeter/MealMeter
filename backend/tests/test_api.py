"""API 명세(5장)대로 동작하는지 확인. 나이스는 가짜로 바꿔서 인터넷 없이 돈다."""
from datetime import date

import pytest
from fastapi.testclient import TestClient

from app import config, neis
from app.main import app

TODAY = date(2026, 10, 19)


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "DB_PATH", str(tmp_path / "test.db"))
    monkeypatch.setattr(config, "today", lambda: TODAY)
    monkeypatch.setattr(neis, "fetch_dishes", lambda day, meal: ["현미밥", "닭갈비", "미역국"])
    with TestClient(app) as test_client:
        yield test_client


def review(menu_id, **fields):
    return {"menuId": menu_id, "rating": 4, **fields}


def test_today_menus(client):
    response = client.get("/api/menus/today")
    assert response.status_code == 200
    body = response.json()
    assert body["date"] == "2026-10-19"
    assert body["mealType"] == "중식"
    assert [menu["name"] for menu in body["menus"]] == ["현미밥", "닭갈비", "미역국"]
    assert body["menus"][0] == {"menuId": 1, "name": "현미밥", "averageRating": 0, "reviewCount": 0}


def test_today_menus_called_twice_does_not_duplicate(client):
    client.get("/api/menus/today")
    assert len(client.get("/api/menus/today").json()["menus"]) == 3


def test_no_meal_today(client, monkeypatch):
    monkeypatch.setattr(neis, "fetch_dishes", lambda day, meal: [])
    assert client.get("/api/menus/today").json()["menus"] == []


def test_neis_down(client, monkeypatch):
    def broken(day, meal):
        raise neis.NeisError("timeout")

    monkeypatch.setattr(neis, "fetch_dishes", broken)
    response = client.get("/api/menus/today")
    assert response.status_code == 502
    assert "message" in response.json()


def test_create_and_list_reviews(client):
    client.get("/api/menus/today")
    response = client.post(
        "/api/reviews",
        json=review(2, rating=5, saltiness="적당", hygiene="문제 있음", comment=" 맛있어요 "),
    )
    assert response.status_code == 201
    saved = response.json()
    assert saved["reviewId"] == 1
    assert saved["comment"] == "맛있어요"
    assert saved["portion"] is None
    assert "createdAt" in saved

    client.post("/api/reviews", json=review(2, rating=2))
    body = client.get("/api/menus/2/reviews").json()
    assert body["name"] == "닭갈비"
    assert body["reviewCount"] == 2
    assert body["averageRating"] == 3.5
    assert body["reviews"][0]["rating"] == 2  # 최신 평가가 먼저

    menus = client.get("/api/menus/today").json()["menus"]
    assert menus[1]["averageRating"] == 3.5 and menus[1]["reviewCount"] == 2


@pytest.mark.parametrize(
    "payload, status, message_part",
    [
        ({"menuId": 1}, 400, "별점"),
        (review(1, rating=6), 400, "별점"),
        (review(1, saltiness="매움"), 400, "간"),
        (review(1, comment="가" * 101), 400, "100자"),
        (review(1, comment="이거 만든 사람 바보"), 400, "욕설"),
        (review(999), 404, "없는 메뉴"),
        ({"rating": 3}, 422, "형식"),
    ],
)
def test_create_review_errors(client, payload, status, message_part):
    client.get("/api/menus/today")
    response = client.post("/api/reviews", json=payload)
    assert response.status_code == status
    assert message_part in response.json()["message"]


def test_unknown_menu_reviews(client):
    response = client.get("/api/menus/999/reviews")
    assert response.status_code == 404
    assert response.json() == {"message": "없는 메뉴예요."}


def test_ranking_groups_by_name(client, monkeypatch):
    client.get("/api/menus/today")  # 1 현미밥, 2 닭갈비, 3 미역국
    monkeypatch.setattr(config, "today", lambda: date(2026, 10, 20))
    monkeypatch.setattr(neis, "fetch_dishes", lambda day, meal: ["닭갈비"])
    client.get("/api/menus/today")  # 4 닭갈비 (다른 날)

    client.post("/api/reviews", json=review(2, rating=5, saltiness="짜다"))
    client.post("/api/reviews", json=review(4, rating=3, saltiness="짜다", hygiene="없음"))
    client.post("/api/reviews", json=review(1, rating=5))
    client.post("/api/reviews", json=review(1, rating=4))
    client.post("/api/reviews", json=review(3, rating=2, hygiene="문제 있음"))

    ranking = client.get("/api/ranking").json()
    assert [(item["rank"], item["name"]) for item in ranking] == [(1, "현미밥"), (2, "닭갈비"), (3, "미역국")]
    chicken = ranking[1]
    assert chicken["reviewCount"] == 2 and chicken["averageRating"] == 4.0
    assert chicken["topTags"] == [{"category": "간", "value": "짜다"}]  # 위생 '없음'은 안 보여 줌
    assert ranking[2]["topTags"] == [{"category": "위생", "value": "문제 있음"}]


def test_parse_neis_response():
    payload = {
        "mealServiceDietInfo": [
            {"head": []},
            {"row": [{"DDISH_NM": "간장계란밥 (1.5.6)<br/>닭갈비* (1.2.5.)<br/>배추김치 (9)<br/>간장계란밥 (1.5.6)"}]},
        ]
    }
    assert neis.parse_dishes(payload) == ["간장계란밥", "닭갈비", "배추김치"]
    assert neis.parse_dishes({"RESULT": {"CODE": "INFO-200"}}) == []
