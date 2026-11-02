// 역할: 서버가 준비되기 전에 쓰는 가짜 서버. 진짜 서버와 같은 모양의 값을 돌려준다. 담당: 조현우
// 페이지를 옮겨도 등록한 평가가 남도록 브라우저 저장소(localStorage)에 보관한다.
// 처음 상태로 되돌리려면 개발자 도구 콘솔에서 localStorage.removeItem('mealmeter-mock-reviews-v2') 실행.
import { HYGIENE_FIELD, HYGIENE_PROBLEM, MEAL_TYPES, TAG_FIELDS } from './reviewFields.js';

// 욕설 거르기 흉내용 단어 목록 (진짜 거르기는 서버 app/rules.py가 한다)
const BANNED_WORDS = [
  '바보', '멍청이', '씨발', '시발', '병신', '개새끼', '좆',
  '섹스', '성관계', '자위', '자지', '보지', '음란', '꼴린다',
];

// Date → "2026-10-27" (서버가 주는 날짜 모양)
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// 오늘에서 며칠 전 날짜 (지난 메뉴 예시를 만들 때 쓴다)
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const today = formatDate(new Date());

// 메뉴 번호는 "그날 나온 메뉴 하나"마다 붙는다. 같은 이름이 다른 날 또 나오면 번호가 다르다.
// mealCode: 1 조식 / 2 중식 / 3 석식
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

let nextReviewId = 1; // 다음에 만들 평가 번호 (하나 만들 때마다 1씩 늘어난다)

// 예시 평가 한 건 만들기. tags 순서: [간, 양, 온도, 식감, 위생], hoursAgo: 몇 시간 전에 쓴 평가인지
function makeReview(menuId, rating, tags, comment, hoursAgo) {
  const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    reviewId: nextReviewId++,
    menuId,
    rating,
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
function loadReviews() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {
    // 저장소를 못 쓰는 환경(비공개 창 등)이면 그냥 예시 평가를 쓴다
  }
  return SEED_REVIEWS;
}

function saveReviews() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    // 저장에 실패해도 지금 페이지에서는 계속 동작한다
  }
}

const reviews = loadReviews();
nextReviewId = Math.max(0, ...reviews.map((review) => review.reviewId)) + 1;

// 진짜 서버처럼 잠깐(0.3초) 기다렸다가 답한다. 그래야 "불러오는 중" 화면도 확인할 수 있다
function wait(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 평가 목록 → { averageRating: 평균 별점(소수 첫째 자리), reviewCount: 평가 수 }
function summarize(list) {
  const reviewCount = list.length;
  const total = list.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = reviewCount === 0 ? 0 : Math.round((total / reviewCount) * 10) / 10;
  return { averageRating, reviewCount };
}

// 항목마다 가장 많이 고른 값을 하나씩 뽑는다.
function topTags(list) {
  const result = [];
  for (const field of [...TAG_FIELDS, HYGIENE_FIELD]) {
    const counts = {};
    for (const review of list) {
      const value = review[field.key];
      if (value) counts[value] = (counts[value] || 0) + 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    // 위생은 "문제 있음"일 때만 보여 준다
    if (best && !(field === HYGIENE_FIELD && best[0] !== HYGIENE_PROBLEM)) {
      result.push({ category: field.label, value: best[0] });
    }
  }
  return result;
}

// 깊은 복사. 페이지가 받은 값을 고쳐도 가짜 서버의 원본은 안 바뀌게 한다 (진짜 서버처럼)
function copy(value) {
  return structuredClone(value);
}

// 아래 함수들은 index.js의 같은 이름 함수와 똑같은 모양으로 돌려준다 (모양은 index.js의 JSDoc 참고)

// 오늘 날짜 + 그 식사의 메뉴 목록 (메뉴마다 평균 별점·평가 수를 붙인다)
export async function getTodayMenus(mealCode) {
  await wait();
  return {
    date: today,
    mealType: MEAL_TYPES[mealCode],
    menus: menus
      .filter((menu) => menu.date === today && menu.mealCode === Number(mealCode))
      .map((menu) => ({
        menuId: menu.menuId,
        name: menu.name,
        ...summarize(reviews.filter((review) => review.menuId === menu.menuId)),
      })),
  };
}

// 메뉴 하나의 정보 + 그 메뉴의 평가 전부
export async function getMenuReviews(menuId) {
  await wait();
  const menu = menus.find((item) => item.menuId === Number(menuId));
  if (!menu) throw new Error('없는 메뉴예요.');

  // 진짜 서버처럼 최신 작성 순서로 돌려준다 (예전에 저장된 순서가 달라도 맞춰진다)
  const list = reviews
    .filter((review) => review.menuId === menu.menuId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    menuId: menu.menuId,
    name: menu.name,
    date: menu.date,
    ...summarize(list),
    reviews: copy(list),
  };
}

// 평가 등록. 진짜 서버처럼 별점·메뉴 번호·욕설을 검사하고, 문제가 있으면 한국어 메시지로 Error를 던진다
export async function createReview(review) {
  await wait();
  const rating = Number(review.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('별점은 1점부터 5점까지 골라 주세요.');
  }
  if (!menus.some((menu) => menu.menuId === Number(review.menuId))) {
    throw new Error('없는 메뉴예요.');
  }
  const comment = review.comment ?? '';
  if (BANNED_WORDS.some((word) => comment.includes(word))) {
    throw new Error('욕설이나 비방 표현은 등록할 수 없어요.');
  }

  const saved = {
    ...review,
    reviewId: nextReviewId++,
    menuId: Number(review.menuId),
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  reviews.unshift(saved);
  saveReviews();
  return copy(saved);
}

// 인기 순위. 평가가 있는 메뉴만, 평균 별점 높은 순
export async function getRanking() {
  await wait();
  // 메뉴 이름 기준으로 모은다 (다른 날 같은 메뉴는 하나로 합침)
  const byName = {};
  for (const menu of menus) {
    const list = reviews.filter((review) => review.menuId === menu.menuId);
    byName[menu.name] = [...(byName[menu.name] || []), ...list];
  }

  // TODO(팀 회의): 평가 수가 적은 메뉴 처리 방식이 정해지면 여기와 서버를 같이 바꾼다.
  return Object.entries(byName)
    .filter(([, list]) => list.length > 0)
    .map(([name, list]) => ({ name, ...summarize(list), topTags: topTags(list) }))
    .sort((a, b) => b.averageRating - a.averageRating)
    .map((item, index) => ({ rank: index + 1, ...item }));
}

// 나이스 급식 정보 흉내 (neis.js의 fetchMealInfo와 같은 모양). 오늘이 아니면 급식이 없는 것으로 친다
export async function getMealInfo(date) {
  await wait();
  if (date !== today) return {};
  return Object.fromEntries(Object.entries(MEAL_INFO).map(([code, info]) => [code, {
    kcal: info.kcal,
    carb: info.carb,
    protein: info.protein,
    fat: info.fat,
    dishes: menus
      .filter((menu) => menu.date === today && menu.mealCode === Number(code))
      .map((menu) => ({ name: menu.name, allergies: info.allergies[menu.name] ?? [] })),
  }]));
}
