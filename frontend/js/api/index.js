// 역할: 서버 부르는 함수 모음 (명세서 5장의 4개 + 나이스 급식 정보). 담당: 박준호
// 페이지에서는 주소를 직접 쓰지 말고 이 함수들만 불러 쓴다.
// VITE_USE_MOCK=false 로 바꾸면 가짜 데이터 대신 진짜 서버와 진짜 나이스를 부른다 (.env.example 참고).
import { request } from './client.js';
import * as mock from './mock.js';
import { fetchMealInfo } from './neis.js';
import { DEFAULT_MEAL_CODE } from './reviewFields.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/**
 * 1. 오늘의 메뉴 조회 — GET /api/menus/today
 * @param {number} [mealCode] 1 조식 / 2 중식 / 3 석식 (없으면 중식)
 * @returns {Promise<{ date: string, mealType: string,
 *   menus: { menuId: number, name: string, averageRating: number, reviewCount: number }[] }>}
 */
export function getTodayMenus(mealCode = DEFAULT_MEAL_CODE) {
  if (USE_MOCK) return mock.getTodayMenus(mealCode);
  return request(`/api/menus/today?mealCode=${mealCode}`);
}

/**
 * 2. 메뉴별 평가 목록 조회 — GET /api/menus/{menuId}/reviews
 * @returns {Promise<{ menuId: number, name: string, date: string, averageRating: number,
 *   reviewCount: number, reviews: Review[] }>}
 */
export function getMenuReviews(menuId) {
  if (USE_MOCK) return mock.getMenuReviews(menuId);
  return request(`/api/menus/${menuId}/reviews`);
}

/**
 * 3. 평가 등록 — POST /api/reviews
 * 실패하면 서버가 보낸 한 줄 메시지를 담은 Error를 던진다.
 * @param {{ menuId: number, rating: number, saltiness: string|null, portion: string|null,
 *   temperature: string|null, texture: string|null, hygiene: string|null, comment: string }} review
 * @returns {Promise<Review>} 등록된 평가 (reviewId, createdAt 포함)
 */
export function createReview(review) {
  if (USE_MOCK) return mock.createReview(review);
  return request('/api/reviews', { method: 'POST', body: JSON.stringify(review) });
}

/**
 * 4. 인기 순위 조회 — GET /api/ranking
 * @returns {Promise<{ rank: number, name: string, averageRating: number, reviewCount: number,
 *   topTags: { category: string, value: string }[] }[]>}
 */
export function getRanking() {
  if (USE_MOCK) return mock.getRanking();
  return request('/api/ranking');
}

// 같은 날짜는 한 번만 부른다 (탭을 바꿀 때마다 나이스를 다시 부르지 않게)
const mealInfoCache = new Map();

/**
 * 5. 그날 급식의 칼로리·영양소·알레르기 — 나이스 급식 API (우리 서버를 거치지 않는다)
 * 실패하면 Error를 던진다. 이 정보 없이도 평가는 할 수 있으니, 페이지는 실패해도 계속 동작해야 한다.
 * 메뉴 찾기는 neis.js의 findDish(meal, 메뉴이름)를 쓴다.
 * @param {string} date "2026-10-27" (getTodayMenus나 getMenuReviews가 준 date)
 * @returns {Promise<Record<number, import('./neis.js').MealInfo>>} 식사 코드(1·2·3) → 정보
 */
export function getMealInfo(date) {
  if (!mealInfoCache.has(date)) {
    const promise = USE_MOCK ? mock.getMealInfo(date) : fetchMealInfo(date);
    // 실패한 결과는 기억하지 않는다 (다시 시도하면 새로 부르도록)
    promise.catch(() => mealInfoCache.delete(date));
    mealInfoCache.set(date, promise);
  }
  return mealInfoCache.get(date);
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
