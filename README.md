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
- 처음에는 **가짜 데이터**로 동작해요 (`js/api/mock.js`). 서버 없이도 모든 화면을 눌러 볼 수 있어요. 등록한 평가는 브라우저 저장소(localStorage)에 남아서 페이지를 옮겨도 유지돼요.
- 백엔드 서버(`localhost:8080`, MealMeter-BE 레포)에 연결하려면 `frontend/.env.example`을 `frontend/.env.local`로 복사하고 `VITE_USE_MOCK=false`로 바꾼 뒤 `npm run dev`를 다시 켜요. 이때 칼로리·영양소·알레르기는 나이스 급식 API에서 브라우저가 직접 받아 와요 (`js/api/neis.js`).
- HTML 파일을 더블클릭해서(`file://`) 열면 CSS·JS가 안 불러와져서 화면이 깨져요. 꼭 `npm run dev` 주소로 열어요.

## 백엔드

백엔드(FastAPI + SQLite)는 [MealMeter/MealMeter-BE](https://github.com/MealMeter/MealMeter-BE) 레포에 따로 있어요. 실행 방법은 그쪽 README를 봐 주세요.

## 페이지

| 페이지 | 주소 | HTML | 동작(JS) | 스타일(CSS) | 담당 |
| --- | --- | --- | --- | --- | --- |
| 오늘의 메뉴 | `/` | `index.html` | `js/pages/main.js` | `css/main.css` | 김태건 |
| └ 오늘 인기 TOP 3 (메인 아래쪽 상자) | `/` | `index.html`의 TOP 3 구역 | `js/pages/todayTop.js` | `css/main.css`의 TOP 3 구역 | 조현우 |
| 메뉴 상세 (평가 작성 + 목록) | `/menu.html?menuId=3&meal=2` | `menu.html` | `js/pages/menu.js` | `css/menu.css` | 박준호 |
| 인기 순위 | `/ranking.html` | `ranking.html` | `js/pages/ranking.js` | `css/ranking.css` | 조현우 |
| 이용 안내 | `/guide.html` | `guide.html` | (없음) | `css/guide.css` | 김근영 |
| 없는 주소 | 그 밖의 주소 | `404.html` | (없음) | `css/base.css` | 김근영 |

## 공통 파일과 담당

| 파일 | 내용 | 담당 |
| --- | --- | --- |
| `js/api/` | 서버 부르는 함수 4개 + 나이스 급식 정보(`index.js`, `neis.js`), 가짜 데이터(`mock.js`), 태그 목록(`reviewFields.js`) | 박준호 |
| `js/common/layout.js` + `css/base.css` 2번 구역 | 모든 페이지의 헤더·푸터·본문 건너뛰기 링크 | 김태건 |
| `js/common/format.js` | 글자 안전하게 바꾸기(`escapeHtml`), 날짜 형식 | 박준호 |
| `js/common/ui.js` + `css/base.css` 3번 구역 | 별점 표시, 태그 배지, 버튼, 카드, 메뉴 그림 글자 | 조현우 |
| `js/common/state.js` + `css/base.css` 4번 구역 | 불러오는 중, 오류, 빈 화면, `loadData` | 김근영 |
| `css/tokens.css`, `css/base.css` 1번 구역 | 색·글자·간격 규칙, 전체 기본 스타일 | 김근영 |
| `vite.config.js` | 개발 서버 설정, `/api` proxy, 404 처리, 페이지 목록 | 박준호 |

공통 함수의 사용법은 각 파일 맨 위 주석에 적혀 있어요.

## 사람별 담당 한눈에 보기

| 담당 | 맡은 것 |
| --- | --- |
| 박준호 | 메뉴 상세 페이지, `js/api/` 전체(서버·나이스·가짜 데이터), `format.js`, `vite.config.js` |
| 김태건 | 오늘의 메뉴(메인) 페이지 — 식사 탭, 칼로리·영양소, 메뉴 목록, 별점 바로 남기기, 알레르기 / 공통 틀(헤더·푸터) `layout.js` + `base.css` 2번 구역 |
| 김근영 | 이용 안내·404 페이지, `state.js`(불러오는 중·오류·빈 화면), 디자인 규칙 `tokens.css`, `base.css` 1번 구역 |
| 조현우 | 인기 순위 페이지, 메인의 오늘 인기 TOP 3(`todayTop.js`), 공통 UI 부품 `ui.js` + `base.css` 3번 구역, 접근성·QA |

## 새 페이지를 만들 때

1. `frontend/`에 `새페이지.html`을 만들어요 (다른 HTML의 `<head>`와 `<script>` 줄을 복사).
2. 필요하면 `js/pages/새페이지.js`, `css/새페이지.css`를 만들어요.
3. `vite.config.js`의 `PAGES` 목록에 이름을 추가해요 (빌드에 들어가도록).
4. 헤더 메뉴에 넣으려면 `js/common/layout.js`의 `NAV_ITEMS`에 추가해요.
