// 역할: 서버 부르는 함수 모음 (명세서 5장의 4개 + 나이스 급식 정보). 담당: 조현우
// 페이지에서는 주소를 직접 쓰지 말고 이 함수들만 불러 쓴다.
// [문법] import { 이름 } from '경로': 다른 파일에서 내보낸 함수를 가져온다
import { request } from './client.js';
import { fetchMealInfo } from './neis.js';

/**
 * 1. 오늘의 메뉴 조회 — GET /api/menus/today
 * @param {number} mealCode 1 조식 / 2 중식 / 3 석식
 * @returns {Promise<{ date: string, mealType: string,
 *   menus: { menuId: number, name: string, averageRating: number, reviewCount: number }[] }>}
 */
export function getTodayMenus(mealCode) {
  // [문법] 주소 뒤 ? 다음은 쿼리 문자열(이름=값). 템플릿 리터럴 ${ } 자리에 값을 끼워 넣는다
  return request(`/api/menus/today?mealCode=${mealCode}`);
}

/**
 * 2. 메뉴별 평가 목록 조회 — GET /api/menus/{menuId}/reviews
 * @returns {Promise<{ menuId: number, name: string, date: string, averageRating: number,
 *   reviewCount: number, reviews: Review[] }>}
 */
export function getMenuReviews(menuId) {
  return request(`/api/menus/${menuId}/reviews`);
}

/**
 * 3. 평가 등록 — POST /api/reviews
 * 실패하면 서버가 보낸 한 줄 메시지를 담은 Error를 던진다.
 * @param {{ menuId: number, rating: number, saltiness: string|null, portion: string|null,
 *   temperature: string|null, texture: string|null, hygiene: string|null, comment: string }} review
 * @returns {Promise<Review & { editToken: string }>} 등록된 평가 (reviewId, createdAt 포함).
 *   editToken은 이 응답에만 오는 수정용 비밀 값이다. 별점을 고치려면 저장해 둔다
 */
export function createReview(review) {
  // [문법] 'POST': 새로 만들기 요청
  return request('/api/reviews', 'POST', review);
}

/**
 * 3-1. 별점 수정 — PATCH /api/reviews/{reviewId}
 * 등록할 때 받은 editToken이 맞아야 고칠 수 있다. 실패하면 서버 메시지를 담은 Error를 던진다.
 * @param {number} reviewId
 * @param {number} rating 1~5
 * @param {string} editToken
 * @returns {Promise<Review>} 고친 평가
 */
export function updateReviewRating(reviewId, rating, editToken) {
  // [문법] 'PATCH': 이미 있는 것의 일부를 고치는 요청
  return request(`/api/reviews/${reviewId}`, 'PATCH', { rating: rating, editToken: editToken });
}

/**
 * 4. 인기 순위 조회 — GET /api/ranking
 * @returns {Promise<{ rank: number, name: string, averageRating: number, reviewCount: number,
 *   topTags: { category: string, value: string }[] }[]>}
 */
export async function getRanking() {
  const items = await request('/api/ranking');
  // 응답 모양이 이상하면 화면이 깨지지 않게 오류로 알려 준다
  // [문법] Array.isArray(값): 배열이면 true
  if (!Array.isArray(items)) {
    throw new Error('순위 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  // [문법] for (const 이름 of 배열): 배열 요소를 하나씩 꺼내 반복한다
  for (const item of items) {
    if (!isRankingItem(item)) {
      throw new Error('순위 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }
  return items;
}

// 순위 한 줄이 { rank, name, averageRating, reviewCount, topTags } 모양이 맞는지 확인한다
function isRankingItem(item) {
  if (!item) return false;
  // [문법] Number.isInteger(값): 정수면 true. typeof 값: 자료형 이름 글자('string' 등)
  if (!Number.isInteger(item.rank) || item.rank <= 0) return false;
  if (typeof item.name !== 'string') return false;
  // [문법] Number.isFinite(값): NaN·무한대가 아닌 진짜 숫자면 true
  if (!Number.isFinite(item.averageRating)) return false;
  if (!Number.isInteger(item.reviewCount) || item.reviewCount < 0) return false;
  if (!Array.isArray(item.topTags)) return false;
  for (const tag of item.topTags) {
    if (!tag || typeof tag.category !== 'string' || typeof tag.value !== 'string') return false;
  }
  return true;
}

// 같은 날짜는 한 번만 부른다 (탭을 바꿀 때마다 나이스를 다시 부르지 않게)
// [문법] { }: 빈 객체. mealInfoCache['2026-10-27'] 처럼 날짜를 키로 써서 저장한다
const mealInfoCache = {};

/**
 * 5. 그날 급식의 칼로리·영양소·알레르기 — 나이스 급식 API (우리 서버를 거치지 않는다)
 * 실패하면 Error를 던진다. 이 정보 없이도 평가는 할 수 있으니, 페이지는 실패해도 계속 동작해야 한다.
 * 메뉴 찾기는 neis.js의 findDish(meal, 메뉴이름)를 쓴다.
 * @param {string} date "2026-10-27" (getTodayMenus나 getMenuReviews가 준 date)
 * @returns {Promise<Record<number, import('./neis.js').MealInfo>>} 식사 코드(1·2·3) → 정보
 */
export function getMealInfo(date) {
  // 저장해 둔 게 없을 때만 새로 부른다
  if (!mealInfoCache[date]) {
    // Promise를 저장해 같은 날짜의 중복 요청을 공유한다.
    const promise = fetchMealInfo(date);
    // 실패한 결과는 기억하지 않는다 (다시 시도하면 새로 부르도록)
    // [문법] promise.catch(함수): 실패했을 때만 함수를 실행한다. delete 객체[키]: 그 키를 지운다
    promise.catch(function () {
      delete mealInfoCache[date];
    });
    mealInfoCache[date] = promise;
  }
  return mealInfoCache[date];
}

/**
 * @typedef {object} Review
 * @property {number} reviewId
 * @property {number} menuId
 * @property {number} rating 1~5
 * @property {string|null} saltiness 간
 * @property {string|null} portion 양
 * @property {string|null} temperature 온도
 * @property {string|null} texture 식감
 * @property {string|null} hygiene 위생
 * @property {string} comment 안 쓰면 빈 문자열
 * @property {string} createdAt ISO 날짜·시각
 */
