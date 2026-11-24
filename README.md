# MealMeter

급식을 이름 없이 평가하고, 쌓인 평가로 더 나은 메뉴를 만드는 서비스예요.
오늘의 메뉴 / 급식 평가·피드백 / 인기 메뉴 순위를 제공해요.

화면은 **React 없이 HTML + CSS + JavaScript**로 만들어요. 페이지마다 HTML 파일이 하나씩 있어요.

## 실행 방법 (프론트엔드)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

- Vite는 개발 서버로만 써요. 파일을 고치면 브라우저가 바로 새로고침되고, `/api` 요청을 백엔드로 넘겨 줘요.
- 메뉴·평가·순위를 쓰려면 MealMeter-BE를 `localhost:8080`에서 먼저 실행해요. 칼로리·영양소·알레르기는 브라우저가 나이스 급식 API에서 직접 받아 와요 (`js/api/neis.js`).
- HTML 파일을 더블클릭해서(`file://`) 열면 CSS·JS가 안 불러와져서 화면이 깨져요. 꼭 `npm run dev` 주소로 열어요.

## 백엔드

백엔드(FastAPI + SQLite)는 [MealMeter/MealMeter-BE](https://github.com/MealMeter/MealMeter-BE) 레포에 따로 있어요. 실행 방법은 그쪽 README를 봐 주세요.

## 페이지

| 페이지 | 주소 | HTML | 동작(JS) | 스타일(CSS) | 담당 |
| --- | --- | --- | --- | --- | --- |
| 오늘의 메뉴 | `/` | `index.html` | `js/pages/main.js` | `css/main.css` | 김태건 |
| └ 오늘 인기 TOP 3 (메인 아래쪽 상자) | `/` | `index.html`의 TOP 3 구역 | `js/pages/todayTop.js` | `css/main.css`의 TOP 3 구역 | 김태건 |
| 메뉴 상세 (평가 작성 + 목록) | `/menu.html?menuId=3&meal=2` | `menu.html` | `js/pages/menu.js` | `css/menu.css` | 박준호 |
| 인기 순위 | `/ranking.html` | `ranking.html` | `js/pages/ranking.js` | `css/ranking.css` | 조현우 |

## 공통 파일과 담당

| 파일 | 내용 | 담당 |
| --- | --- | --- |
| `js/api/` | 서버 부르는 함수 5개(평가 등록·별점 수정 포함) + 나이스 급식 정보(`index.js`, `neis.js`, `client.js`), 태그 목록(`reviewFields.js`) | 조현우 |
| `css/base.css` 1번 구역 | 전체 기본 스타일 | 조현우 |
| `js/common/layout.js` + `css/base.css` 2번 구역 | 모든 페이지의 헤더·푸터·본문 건너뛰기 링크 | 김근영 |
| `js/common/ui.js` + `css/base.css` 3번 구역 | 별점 표시, 태그 배지, 버튼, 카드, 메뉴 그림 글자 | 김근영 |
| `js/common/state.js` + `css/base.css` 4번 구역 | 불러오는 중, 오류, 빈 화면, `loadData` | 김근영 |
| `js/common/format.js` | 글자 안전하게 바꾸기(`escapeHtml`), 날짜 형식 | 김근영 |
| `css/tokens.css` | 색·글자·간격 규칙(디자인 변수) | 김근영 |
| `vite.config.js` | 개발 서버 설정, `/api` proxy, 페이지 목록 | 김근영 |

공통 함수의 사용법은 각 파일 맨 위 주석에 적혀 있어요.

## 사람별 담당 한눈에 보기

분량은 **JS 파일만** 센 것으로, 주석과 빈 줄을 뺀 실제 코드 줄 수예요 (HTML·CSS는 빼고 셌어요).
김근영은 지금까지 기여도(문법 주석 정리, 별점 수정 기능, 페이지 정리)를 반영해 가장 적게 맡아요.

| 담당 | 맡은 것 | 분량 |
| --- | --- | --- |
| 박준호 | 메뉴 상세 페이지(`menu.html`, `menu.js`, `menu.css`) | JS 약 330줄 |
| 김태건 | 오늘의 메뉴(메인) 페이지 전체(`index.html`, `main.js`, `main.css`, 오늘 인기 TOP 3 `todayTop.js`) | JS 약 480줄 |
| 조현우 | 인기 순위 페이지(`ranking.html`, `ranking.js`, `ranking.css`), `js/api/` 전체(서버·나이스), `base.css` 1번(기본 스타일), 접근성·QA | JS 약 260줄 + QA |
| 김근영 | `layout.js` + `base.css` 2번(헤더·푸터), `ui.js` + `base.css` 3번(공통 UI 부품), `state.js` + `base.css` 4번(상태 표시), `format.js`, `tokens.css`(디자인 변수), `vite.config.js` | JS 약 210줄 |

## 새 페이지를 만들 때

1. `frontend/`에 `새페이지.html`을 만들어요 (다른 HTML의 `<head>`와 `<script>` 줄을 복사).
2. 필요하면 `js/pages/새페이지.js`, `css/새페이지.css`를 만들어요.
3. `vite.config.js`의 `PAGES` 목록에 이름을 추가해요 (빌드에 들어가도록).
4. 헤더 메뉴에 넣으려면 `js/common/layout.js`의 `NAV_ITEMS`에 추가해요.
