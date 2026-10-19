# MealMeter

급식을 이름 없이 평가하고, 쌓인 평가로 더 나은 메뉴를 만드는 서비스예요.
오늘의 메뉴 / 급식 평가·피드백 / 인기 메뉴 순위를 제공해요.

## 실행 방법 (프론트엔드)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

- 처음에는 **가짜 데이터**로 동작해요 (`src/api/mock.js`). 서버 없이도 모든 화면을 눌러 볼 수 있어요.
- Spring 서버(`localhost:8080`)에 연결하려면 `frontend/.env.example`을 `frontend/.env.local`로 복사하고 `VITE_USE_MOCK=false`로 바꾼 뒤 `npm run dev`를 다시 켜요. `/api` 요청은 Vite proxy가 서버로 넘겨 줘요.

## 폴더와 담당

| 폴더 | 내용 | 담당 |
| --- | --- | --- |
| `src/App.jsx` | 주소 ↔ 페이지 연결 | 박준호 |
| `src/api/` | 서버 부르는 함수 4개, 가짜 데이터, 태그 목록 | 박준호 |
| `src/components/layout/` | 헤더, 공통 틀 | 박준호 |
| `src/components/ui/` | 별점 표시, 태그 배지, 버튼, 카드 | 김태건 |
| `src/components/state/` | 불러오는 중, 오류, 빈 화면 | 조현우 |
| `src/styles/` | 색·글자·간격 규칙 | 김태건 |
| `src/pages/MainPage/` (`/`) | 오늘의 메뉴 | 김태건 |
| `src/pages/MenuDetailPage/` (`/menus/:menuId`) | 평가 작성 + 목록 | 박준호 |
| `src/pages/RankingPage/` (`/ranking`) | 인기 순위 | 조현우 |
| `src/pages/GuidePage/` (`/guide`) | 이용 안내 | 조현우 |

공통 부품의 사용법(props)은 각 파일 맨 위 주석에 적혀 있어요.
