// 역할: 서버가 준비되기 전에 쓰는 가짜 서버. 진짜 서버와 같은 모양의 값을 돌려준다.
// 새로고침하면 등록한 평가는 사라진다.
import { HYGIENE_FIELD, HYGIENE_PROBLEM, MEAL_TYPES, TAG_FIELDS } from './reviewFields.js';

const BANNED_WORDS = [
  '바보', '멍청이', '씨발', '시발', '병신', '개새끼', '좆',
  '섹스', '성관계', '자위', '자지', '보지', '음란', '꼴린다',
];

function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

const today = formatDate(new Date());

// 메뉴 번호는 "그날 나온 메뉴 하나"마다 붙는다. 같은 이름이 다른 날 또 나오면 번호가 다르다.
const menus = [
  { menuId: 1, name: '현미밥', date: today },
  { menuId: 2, name: '닭갈비', date: today },
  { menuId: 3, name: '미역국', date: today },
  { menuId: 4, name: '계절 샐러드', date: today },
  { menuId: 5, name: '깍두기', date: today },
  { menuId: 6, name: '바삭한 치킨까스', date: formatDate(daysAgo(1)) },
  { menuId: 7, name: '토마토 스파게티', date: formatDate(daysAgo(2)) },
  { menuId: 8, name: '닭갈비', date: formatDate(daysAgo(7)) },
];

let nextReviewId = 1;

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

const reviews = [
  makeReview(2, 5, ['적당', '적다', '뜨겁다', '적당'], '닭갈비가 촉촉하고 맛있었어요!', 1),
  makeReview(2, 4, ['짜다', '적당', '적당', '적당'], '', 2),
  makeReview(3, 3, ['싱겁다', '적당', '차갑다', '적당'], '국이 조금 식어 있었어요.', 2),
  makeReview(1, 4, ['적당', '적당', '적당', '딱딱'], '', 3),
  makeReview(6, 5, ['적당', '적다', '뜨겁다', '적당'], '또 나왔으면 좋겠어요', 26),
  makeReview(6, 5, ['적당', '적당', '적당', '적당'], '', 27),
  makeReview(7, 4, ['짜다', '적당', '적당', '무름'], '', 50),
  makeReview(7, 5, ['적당', '많다', '뜨겁다', '적당'], '소스가 맛있어요', 51),
  makeReview(8, 3, ['짜다', '적다', '적당', '딱딱'], '', 170),
].reverse();

function wait(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function copy(value) {
  return structuredClone(value);
}

export async function getTodayMenus(mealCode) {
  await wait();
  return {
    date: today,
    mealType: MEAL_TYPES[mealCode],
    menus: menus
      .filter((menu) => menu.date === today)
      .map((menu) => ({
        menuId: menu.menuId,
        name: menu.name,
        ...summarize(reviews.filter((review) => review.menuId === menu.menuId)),
      })),
  };
}

export async function getMenuReviews(menuId) {
  await wait();
  const menu = menus.find((item) => item.menuId === Number(menuId));
  if (!menu) throw new Error('없는 메뉴예요.');

  const list = reviews.filter((review) => review.menuId === menu.menuId);
  return {
    menuId: menu.menuId,
    name: menu.name,
    date: menu.date,
    ...summarize(list),
    reviews: copy(list),
  };
}

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
  return copy(saved);
}

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
