// 역할: 서버가 준비되기 전에 쓰는 가짜 서버. 진짜 서버와 같은 모양의 값을 돌려준다. 담당: 조현우
// 페이지를 옮겨도 등록한 평가가 남도록 브라우저 저장소(localStorage)에 보관한다.
// 처음 상태로 되돌리려면 개발자 도구 콘솔에서 localStorage.removeItem('mealmeter-mock-reviews-v2') 실행.
// [문법] import { A, B, C } from '경로': 한 파일에서 여러 이름을 한 번에 가져온다
import { HYGIENE_FIELD, HYGIENE_PROBLEM, MEAL_TYPES, TAG_FIELDS } from './reviewFields.js';

// 욕설 거르기 흉내용 단어 목록 (진짜 거르기는 서버 app/rules.py가 한다)
// [문법] 문자열 배열. 아래 createReview에서 의견에 이 단어가 들어 있는지 검사한다
const BANNED_WORDS = [
  '바보', '멍청이', '씨발', '시발', '병신', '개새끼', '좆',
  '섹스', '성관계', '자위', '자지', '보지', '음란', '꼴린다',
];

// Date → "2026-10-27" (서버가 주는 날짜 모양)
// [문법] date: 자바스크립트 Date 객체를 받는다
function formatDate(date) {
  // [문법] getMonth(): 0(1월)~11(12월)을 돌려줘서 1을 더한다
  // [문법] padStart(2, '0'): 글자를 2자리로 맞추고 모자라면 앞을 '0'으로 채운다 → '3' → '03'
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  // [문법] 템플릿 리터럴로 'YYYY-MM-DD' 모양을 만든다. getFullYear(): 네 자리 연도
  return `${date.getFullYear()}-${month}-${day}`;
}

// 오늘에서 며칠 전 날짜 (지난 메뉴 예시를 만들 때 쓴다)
function daysAgo(days) {
  // [문법] new Date(): 인자 없이 만들면 '지금' 시각
  const date = new Date();
  // [문법] setDate(일): 날짜(일)를 바꾼다. 0이나 음수가 되면 자동으로 이전 달로 넘어간다
  date.setDate(date.getDate() - days);
  return date;
}

// [문법] 파일이 처음 실행될 때 한 번 계산해 두는 오늘 날짜 글자
const today = formatDate(new Date());

// 메뉴 번호는 "그날 나온 메뉴 하나"마다 붙는다. 같은 이름이 다른 날 또 나오면 번호가 다르다.
// mealCode: 1 조식 / 2 중식 / 3 석식
// [문법] 객체 배열. 메뉴 하나 = { menuId, name, date, mealCode }
const menus = [
  { menuId: 1, name: '찹쌀밥', date: today, mealCode: 1 },
  { menuId: 2, name: '북엇국', date: today, mealCode: 1 },
  { menuId: 3, name: '비엔나야채볶음', date: today, mealCode: 1 },
  { menuId: 4, name: '배추김치', date: today, mealCode: 1 },
  { menuId: 5, name: '흰우유', date: today, mealCode: 1 },
  { menuId: 6, name: '흑미밥', date: today, mealCode: 2 },
  { menuId: 7, name: '소고기무국', date: today, mealCode: 2 },
  { menuId: 8, name: '제육볶음', date: today, mealCode: 2 },
  { menuId: 9, name: '시금치나물', date: today, mealCode: 2 },
  { menuId: 10, name: '깍두기', date: today, mealCode: 2 },
  { menuId: 11, name: '망고푸딩', date: today, mealCode: 2 },
  { menuId: 12, name: '김치볶음밥', date: today, mealCode: 3 },
  { menuId: 13, name: '유부장국', date: today, mealCode: 3 },
  { menuId: 14, name: '치킨너겟', date: today, mealCode: 3 },
  { menuId: 15, name: '양배추샐러드', date: today, mealCode: 3 },
  { menuId: 16, name: '딸기요구르트', date: today, mealCode: 3 },
  { menuId: 17, name: '치즈돈가스', date: formatDate(daysAgo(1)), mealCode: 2 },
  { menuId: 18, name: '떡볶이', date: formatDate(daysAgo(2)), mealCode: 3 },
  { menuId: 19, name: '제육볶음', date: formatDate(daysAgo(7)), mealCode: 2 },
];

// 나이스가 주는 칼로리·영양소·알레르기 흉내 (오늘 메뉴만). 메뉴 이름은 위 menus와 같아야 한다
// [문법] 중첩 객체: { 식사코드: { kcal, ..., allergies: { 메뉴이름: [알레르기들] } } }
// [문법] 객체 키를 따옴표 없이 '북엇국:'처럼 쓸 수 있다(이름에 공백·기호가 없으면)
const MEAL_INFO = {
  1: { kcal: 652.4, carb: 98.1, protein: 27.4, fat: 16.2, allergies: {
    북엇국: ['난류', '대두', '밀', '아황산류'], 비엔나야채볶음: ['난류', '우유', '대두', '밀', '돼지고기', '토마토'],
    배추김치: ['새우', '아황산류'], 흰우유: ['우유'],
  } },
  2: { kcal: 812.3, carb: 120.3, protein: 35.2, fat: 22.1, allergies: {
    소고기무국: ['대두', '밀', '쇠고기'], 제육볶음: ['대두', '밀', '돼지고기', '아황산류'],
    시금치나물: ['대두'], 깍두기: ['새우', '아황산류'], 망고푸딩: ['우유'],
  } },
  3: { kcal: 768.9, carb: 110.7, protein: 31.6, fat: 24.8, allergies: {
    김치볶음밥: ['난류', '대두', '밀', '새우', '돼지고기'], 유부장국: ['대두', '밀'],
    치킨너겟: ['난류', '우유', '대두', '밀', '닭고기'], 양배추샐러드: ['난류', '대두', '토마토'], 딸기요구르트: ['우유'],
  } },
};

// [문법] let: 값이 계속 바뀌는 변수(평가를 만들 때마다 1씩 증가)
let nextReviewId = 1; // 다음에 만들 평가 번호 (하나 만들 때마다 1씩 늘어난다)

// 예시 평가 한 건 만들기. tags 순서: [간, 양, 온도, 식감, 위생], hoursAgo: 몇 시간 전에 쓴 평가인지
// [문법] 매개변수 5개를 받아 평가 객체 하나를 만들어 돌려주는 함수
function makeReview(menuId, rating, tags, comment, hoursAgo) {
  // [문법] Date.now(): 1970년부터 지금까지 지난 밀리초(1/1000초) 숫자
  // [문법] hoursAgo * 60 * 60 * 1000: 시간 → 밀리초로 바꾼다. 빼면 그만큼 과거 시각
  // [문법] .toISOString(): '2026-10-26T03:30:00.000Z' 모양 글자로
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    // [문법] nextReviewId++: 지금 값을 쓰고 '그다음에' 1을 더한다(후위 증가)
    reviewId: nextReviewId++,
    // [문법] menuId, : { menuId: menuId } 의 줄임(단축 속성)
    menuId,
    rating,
    // [문법] tags[0] ?? null: 배열 0번 값이 없거나(undefined) null이면 null
    saltiness: tags[0] ?? null,
    portion: tags[1] ?? null,
    temperature: tags[2] ?? null,
    texture: tags[3] ?? null,
    hygiene: tags[4] ?? '없음',
    comment,
    createdAt,
  };
}

// 최신 작성 순서 (새 평가도 createReview에서 맨 앞에 넣는다)
// [문법] makeReview(...)를 여러 번 불러 만든 예시 평가 배열
const SEED_REVIEWS = [
  makeReview(8, 5, ['적당', '적다', '뜨겁다', '적당'], '고기가 부드럽고 양념이 딱 좋았어요. 양만 조금 더 많으면 좋겠어요.', 1),
  makeReview(8, 4, ['짜다', '적당', null, null], '맛있는데 약간 짰어요.', 1.2),
  makeReview(7, 3, ['싱겁다', null, '뜨겁다', null], '국물이 조금 싱거웠어요. 무는 잘 익었어요.', 1.3),
  makeReview(7, 2, ['싱겁다', null, null, null, '문제 있음'], '국에 머리카락 같은 게 들어 있었어요. 확인 부탁드려요.', 1.5),
  makeReview(11, 5, [null, '적다', '차갑다', null], '시원하고 맛있어요', 2),
  makeReview(2, 4, ['적당', '적당', '뜨겁다', null], '', 6),
  makeReview(17, 5, ['적당', '적다', '뜨겁다', '적당'], '또 나왔으면 좋겠어요', 26),
  makeReview(17, 4, ['적당', '적당', '적당', '적당'], '', 27),
  makeReview(18, 4, ['짜다', '적다', '적당', '무름'], '', 50),
  makeReview(18, 5, ['짜다', '많다', '뜨겁다', '적당'], '소스가 맛있어요', 51),
  makeReview(19, 3, ['짜다', '적다', '적당', '딱딱'], '', 170),
];

// 메뉴 번호 체계가 바뀌어서 v2 (예전 저장값과 섞이지 않게)
const STORAGE_KEY = 'mealmeter-mock-reviews-v2';

// 저장해 둔 평가가 있으면 그걸 쓰고, 없으면(처음 열었거나 저장소를 못 쓰면) 위의 예시 평가를 쓴다
// [문법] 저장된 평가를 불러오는 함수. 실패해도 멈추지 않게 try/catch로 감쌌다
function loadReviews() {
  try {
    // [문법] localStorage.getItem(키): 브라우저에 저장해 둔 글자를 꺼낸다(없으면 null)
    // [문법] JSON.parse(글자): JSON 글자를 다시 객체·배열로 바꾼다
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // [문법] Array.isArray(값): 배열인지 확인. 저장값이 망가졌으면 예시 평가를 쓴다
    if (Array.isArray(saved)) return saved;
  // [문법] catch { }: 오류 정보가 필요 없으면 (err) 없이 쓴다
  } catch {
    // 저장소를 못 쓰는 환경(비공개 창 등)이면 그냥 예시 평가를 쓴다
  }
  return SEED_REVIEWS;
}

function saveReviews() {
  try {
    // [문법] localStorage.setItem(키, 글자): 브라우저에 저장. 객체는 JSON.stringify로 글자로 바꿔야 한다
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // 저장에 실패해도 지금 페이지에서는 계속 동작한다
  }
}

// [문법] const지만 배열 안의 내용은 바꿀 수 있다(unshift 등). 변수에 다른 배열을 넣는 것만 안 된다
const reviews = loadReviews();
// [문법] ...배열: 전개 문법. 배열 요소를 낱개 인자로 펼쳐 Math.max에 넘긴다 → 가장 큰 번호 + 1
nextReviewId = Math.max(0, ...reviews.map((review) => review.reviewId)) + 1;

// 진짜 서버처럼 잠깐(0.3초) 기다렸다가 답한다. 그래야 "불러오는 중" 화면도 확인할 수 있다
// [문법] ms = 300: 기본 0.3초
function wait(ms = 300) {
  // [문법] new Promise((resolve) => ...): 나중에 끝나는 작업을 직접 만든다. resolve()를 부르면 '끝났다'가 된다
  // [문법] setTimeout(함수, ms): ms 밀리초 뒤에 함수를 한 번 실행한다. 그래서 await wait()는 0.3초 기다린다
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 평가 목록 → { averageRating: 평균 별점(소수 첫째 자리), reviewCount: 평가 수 }
function summarize(list) {
  const reviewCount = list.length;
  // [문법] 배열.reduce((누적, 요소) => 새누적, 시작값): 요소를 하나씩 돌며 값 하나로 줄인다. 여기서는 별점 합계
  const total = list.reduce((sum, review) => sum + review.rating, 0);
  // [문법] Math.round(x * 10) / 10: 소수 첫째 자리까지 반올림하는 흔한 방법
  const averageRating = reviewCount === 0 ? 0 : Math.round((total / reviewCount) * 10) / 10;
  // [문법] { averageRating, reviewCount }: 단축 속성으로 객체를 만들어 돌려준다
  return { averageRating, reviewCount };
}

// 항목마다 가장 많이 고른 값을 하나씩 뽑는다.
function topTags(list) {
  const result = [];
  // [문법] for (const x of 배열) { }: 배열 요소를 하나씩 x에 넣어 반복한다
  // [문법] [...TAG_FIELDS, HYGIENE_FIELD]: 배열을 펼치고 뒤에 하나를 더 붙인 새 배열
  for (const field of [...TAG_FIELDS, HYGIENE_FIELD]) {
    // [문법] 빈 객체. { '짜다': 2, '적당': 1 } 처럼 값마다 몇 번 나왔는지 센다
    const counts = {};
    for (const review of list) {
      // [문법] 객체[변수]: 대괄호로 '변수에 든 이름'의 속성을 꺼낸다(review['saltiness'])
      const value = review[field.key];
      // [문법] 처음이면 undefined || 0 → 0에서 1 더하기. 있으면 기존 값 + 1
      if (value) counts[value] = (counts[value] || 0) + 1;
    }
    // [문법] Object.entries(객체): [[키, 값], ...] 배열로 바꾼다
    // [문법] b[1] - a[1]: 값(개수) 큰 순으로 정렬. 끝의 [0]으로 1등만 꺼낸다
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    // 위생은 "문제 있음"일 때만 보여 준다
    // [문법] !( ... ): 괄호 안 조건 전체를 뒤집는다. === 로 같은 객체인지 비교
    if (best && !(field === HYGIENE_FIELD && best[0] !== HYGIENE_PROBLEM)) {
      // [문법] 배열.push(값): 배열 맨 뒤에 추가
      result.push({ category: field.label, value: best[0] });
    }
  }
  return result;
}

// 깊은 복사. 페이지가 받은 값을 고쳐도 가짜 서버의 원본은 안 바뀌게 한다 (진짜 서버처럼)
function copy(value) {
  // [문법] structuredClone(값): 객체·배열을 안쪽까지 통째로 복사(깊은 복사)
  return structuredClone(value);
}

// 진짜 서버처럼 수정용 비밀 값(editToken)은 평가 목록에 내보내지 않는다
// [문법] 매개변수에서 바로 구조 분해: editToken만 따로 꺼내고 ...review 에 나머지 속성을 모은다(나머지 문법)
// [문법] 그래서 review를 돌려주면 editToken이 빠진 객체가 된다
function withoutToken({ editToken, ...review }) {
  return review;
}

// 아래 함수들은 index.js의 같은 이름 함수와 똑같은 모양으로 돌려준다 (모양은 index.js의 JSDoc 참고)

// 오늘 날짜 + 그 식사의 메뉴 목록 (메뉴마다 평균 별점·평가 수를 붙인다)
// [문법] export async function: 내보내는 비동기 함수. 진짜 서버처럼 Promise를 돌려준다
export async function getTodayMenus(mealCode) {
  // [문법] await: wait()의 Promise가 끝날 때(0.3초)까지 기다린다
  await wait();
  return {
    date: today,
    mealType: MEAL_TYPES[mealCode],
    menus: menus
      // [문법] &&: 두 조건이 모두 참인 메뉴만. Number(...)로 글자 '2'도 숫자 2로 맞춰 비교
      .filter((menu) => menu.date === today && menu.mealCode === Number(mealCode))
      .map((menu) => ({
        menuId: menu.menuId,
        name: menu.name,
        // [문법] ...객체: summarize가 돌려준 { averageRating, reviewCount }를 이 객체 안에 펼쳐 넣는다
        ...summarize(reviews.filter((review) => review.menuId === menu.menuId)),
      })),
  };
}

// 메뉴 하나의 정보 + 그 메뉴의 평가 전부
// [문법] 메뉴 하나와 그 평가 목록을 돌려준다
export async function getMenuReviews(menuId) {
  await wait();
  // [문법] 배열.find: 조건에 맞는 첫 요소(없으면 undefined)
  const menu = menus.find((item) => item.menuId === Number(menuId));
  // [문법] throw new Error: 오류를 던진다. 부른 쪽(loadData 등)이 메시지를 화면에 보여 준다
  if (!menu) throw new Error('없는 메뉴예요.');

  // 진짜 서버처럼 최신 작성 순서로 돌려준다 (예전에 저장된 순서가 달라도 맞춰진다)
  const list = reviews
    .filter((review) => review.menuId === menu.menuId)
    // [문법] 문자열.localeCompare(다른글자): 글자 순서 비교. b 기준으로 비교해서 최신이 앞(내림차순)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    menuId: menu.menuId,
    name: menu.name,
    date: menu.date,
    ...summarize(list),
    // [문법] list.map(withoutToken): 함수 이름을 넘겨 각 평가에서 editToken을 뺀다
    reviews: copy(list.map(withoutToken)),
  };
}

// 평가 등록. 진짜 서버처럼 별점·메뉴 번호·욕설을 검사하고, 문제가 있으면 한국어 메시지로 Error를 던진다
// [문법] 평가 등록 흉내. 검사 → 저장 → 저장한 평가를 돌려준다
export async function createReview(review) {
  await wait();
  const rating = Number(review.rating);
  // [문법] Number.isInteger(값): 정수인지. || 는 '또는' — 하나라도 참이면 잘못된 별점
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('별점은 1점부터 5점까지 골라 주세요.');
  }
  // [문법] 배열.some: 하나라도 맞으면 true. 앞의 ! 로 '하나도 없으면'
  if (!menus.some((menu) => menu.menuId === Number(review.menuId))) {
    throw new Error('없는 메뉴예요.');
  }
  // [문법] ?? '': comment가 없으면 빈 글자
  const comment = review.comment ?? '';
  // [문법] 문자열.includes(단어): 그 단어가 들어 있으면 true
  if (BANNED_WORDS.some((word) => comment.includes(word))) {
    throw new Error('욕설이나 비방 표현은 등록할 수 없어요.');
  }

  // [문법] ...review 로 받은 값을 복사하고, 아래 속성들로 덮어쓴 새 객체(뒤에 쓴 속성이 이긴다)
  const saved = {
    ...review,
    reviewId: nextReviewId++,
    menuId: Number(review.menuId),
    rating,
    comment,
    createdAt: new Date().toISOString(),
    // [문법] crypto.randomUUID(): 브라우저 내장 기능. 겹치지 않는 무작위 ID 글자를 만든다
    editToken: crypto.randomUUID(), // 등록한 브라우저만 받는 수정용 비밀 값
  };
  // [문법] 배열.unshift(값): 배열 맨 앞에 추가(최신 평가가 앞)
  reviews.unshift(saved);
  saveReviews();
  return copy(saved);
}

// 별점 수정. 진짜 서버(PATCH /api/reviews/{reviewId})와 같은 검사와 메시지를 쓴다
// [문법] 별점 수정 흉내. 번호와 비밀 값이 맞는지 검사한 뒤 별점만 바꾼다
export async function updateReviewRating(reviewId, rating, editToken) {
  await wait();
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error('별점은 1점부터 5점까지 골라 주세요.');
  }
  const review = reviews.find((item) => item.reviewId === Number(reviewId));
  if (!review) throw new Error('없는 평가예요.');
  // [문법] !== : 엄격하게 다르면 true. 비밀 값이 없거나 다르면 고칠 수 없다
  if (!review.editToken || review.editToken !== editToken) {
    throw new Error('이 평가는 고칠 수 없어요.');
  }
  // [문법] 객체.속성 = 값: 찾은 평가 객체의 별점을 직접 바꾼다(배열 안의 같은 객체라 목록에도 반영된다)
  review.rating = value;
  saveReviews();
  return copy(withoutToken(review));
}

// 인기 순위. 평가가 있는 메뉴만, 평균 별점 높은 순
// [문법] 인기 순위 흉내. 이름별로 모은 뒤 평균 별점 순으로 정렬해 순위를 붙인다
export async function getRanking() {
  await wait();
  // 메뉴 이름 기준으로 모은다 (다른 날 같은 메뉴는 하나로 합침)
  // [문법] { 메뉴이름: [평가들] } 모양으로 채울 빈 객체
  const byName = {};
  // [문법] for...of: 메뉴를 하나씩 돌며
  for (const menu of menus) {
    const list = reviews.filter((review) => review.menuId === menu.menuId);
    // [문법] [...A, ...B]: 두 배열을 펼쳐 하나로 합친다. 처음엔 || []로 빈 배열에서 시작
    byName[menu.name] = [...(byName[menu.name] || []), ...list];
  }

  // TODO(팀 회의): 평가 수가 적은 메뉴 처리 방식이 정해지면 여기와 서버를 같이 바꾼다.
  // [문법] Object.entries로 [이름, 평가배열] 쌍 배열을 만든 뒤 메서드 체이닝
  return Object.entries(byName)
    // [문법] ([, list]): 배열 구조 분해에서 첫 칸을 건너뛰고(쉼표만) 두 번째만 list로 꺼낸다
    .filter(([, list]) => list.length > 0)
    // [문법] 객체를 바로 돌려주려고 ({ ... })처럼 괄호로 감쌌다
    .map(([name, list]) => ({ name, ...summarize(list), topTags: topTags(list) }))
    .sort((a, b) => b.averageRating - a.averageRating)
    // [문법] map의 두 번째 인자 index(0부터)로 순위를 붙인다
    .map((item, index) => ({ rank: index + 1, ...item }));
}

// 나이스 급식 정보 흉내 (neis.js의 fetchMealInfo와 같은 모양). 오늘이 아니면 급식이 없는 것으로 친다
// [문법] 나이스 정보 흉내. 오늘이 아니면 빈 객체
export async function getMealInfo(date) {
  await wait();
  // [문법] !== : 오늘 날짜와 다르면
  if (date !== today) return {};
  // [문법] Object.entries → map으로 [코드, 새객체] 쌍을 만들고 → Object.fromEntries로 다시 객체로 묶는다
  return Object.fromEntries(Object.entries(MEAL_INFO).map(([code, info]) => [code, {
    kcal: info.kcal,
    carb: info.carb,
    protein: info.protein,
    fat: info.fat,
    dishes: menus
      .filter((menu) => menu.date === today && menu.mealCode === Number(code))
      // [문법] info.allergies[메뉴이름]: 대괄호로 이름 키를 꺼낸다. 없으면 빈 배열
      .map((menu) => ({ name: menu.name, allergies: info.allergies[menu.name] ?? [] })),
  }]));
}
