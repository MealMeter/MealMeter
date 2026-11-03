// 역할: 서버 부르는 함수 모음 (명세서 5장의 4개 + 나이스 급식 정보). 담당: 조현우
// 페이지에서는 주소를 직접 쓰지 말고 이 함수들만 불러 쓴다.
// VITE_USE_MOCK=false 로 바꾸면 가짜 데이터 대신 진짜 서버와 진짜 나이스를 부른다 (.env.example 참고).
// [문법] import { 이름 } from '경로': 다른 파일에서 내보낸 함수를 가져온다
import { request } from './client.js';
// [문법] import * as 이름: 그 파일이 내보낸 것 전부를 한 객체로 가져온다. mock.getRanking() 처럼 쓴다
import * as mock from './mock.js';
import { fetchMealInfo } from './neis.js';
import { DEFAULT_MEAL_CODE } from './reviewFields.js';

// true면 가짜 서버(mock.js), false면 진짜 서버. 값을 따로 안 정하면 가짜 서버를 쓴다
// [문법] import.meta.env.VITE_이름: Vite가 .env 파일 값을 넣어 주는 자리(VITE_로 시작해야 브라우저 코드에서 보인다)
// [문법] !== 'false': 값이 정확히 'false'가 아니면 true → 기본은 가짜 서버
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// [문법] /** ... */: JSDoc 주석. @param(매개변수), @returns(돌려주는 값) 모양을 적어 두면 편집기가 자동 완성에 쓴다
// [문법] Promise<X>: 나중에 X를 돌려주는 비동기 값이라는 뜻
/**
 * 1. 오늘의 메뉴 조회 — GET /api/menus/today
 * @param {number} [mealCode] 1 조식 / 2 중식 / 3 석식 (없으면 중식)
 * @returns {Promise<{ date: string, mealType: string,
 *   menus: { menuId: number, name: string, averageRating: number, reviewCount: number }[] }>}
 */
// [문법] mealCode = DEFAULT_MEAL_CODE: 인자를 안 주면 기본값(중식 2)
export function getTodayMenus(mealCode = DEFAULT_MEAL_CODE) {
  // [문법] if (조건) return ...;: 가짜 서버 모드면 mock 함수 결과를 돌려주고 여기서 끝낸다
  if (USE_MOCK) return mock.getTodayMenus(mealCode);
  // [문법] `...?mealCode=${mealCode}`: 주소 뒤 ? 다음은 쿼리 문자열(이름=값). 템플릿 리터럴로 값을 끼워 넣는다
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
 * @returns {Promise<Review & { editToken: string }>} 등록된 평가 (reviewId, createdAt 포함).
 *   editToken은 이 응답에만 오는 수정용 비밀 값이다. 별점을 고치려면 저장해 둔다
 */
export function createReview(review) {
  if (USE_MOCK) return mock.createReview(review);
  // [문법] method: 'POST': 새로 만들기 요청. body: 보내는 내용
  // [문법] JSON.stringify(객체): 객체를 JSON 글자로 바꾼다(서버로 보낼 수 있는 모양)
  return request('/api/reviews', { method: 'POST', body: JSON.stringify(review) });
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
  if (USE_MOCK) return mock.updateReviewRating(reviewId, rating, editToken);
  // [문법] method: 'PATCH': 이미 있는 것의 일부를 고치는 요청
  // [문법] { rating, editToken }: { rating: rating, editToken: editToken } 의 줄임(단축 속성)
  return request(`/api/reviews/${reviewId}`, { method: 'PATCH', body: JSON.stringify({ rating, editToken }) });
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
// [문법] new Map(): 키 → 값을 저장하는 표. set(키, 값), get(키), has(키), delete(키)를 쓴다
const mealInfoCache = new Map();

/**
 * 5. 그날 급식의 칼로리·영양소·알레르기 — 나이스 급식 API (우리 서버를 거치지 않는다)
 * 실패하면 Error를 던진다. 이 정보 없이도 평가는 할 수 있으니, 페이지는 실패해도 계속 동작해야 한다.
 * 메뉴 찾기는 neis.js의 findDish(meal, 메뉴이름)를 쓴다.
 * @param {string} date "2026-10-27" (getTodayMenus나 getMenuReviews가 준 date)
 * @returns {Promise<Record<number, import('./neis.js').MealInfo>>} 식사 코드(1·2·3) → 정보
 */
export function getMealInfo(date) {
  // [문법] has(키): 표에 그 키가 있는지. 없을 때만 새로 부른다(캐시)
  if (!mealInfoCache.has(date)) {
    // [문법] 삼항 연산자로 가짜/진짜 중 하나를 고른다. await 없이 Promise 자체를 저장해서 동시에 여러 번 불러도 한 번만 요청한다
    const promise = USE_MOCK ? mock.getMealInfo(date) : fetchMealInfo(date);
    // 실패한 결과는 기억하지 않는다 (다시 시도하면 새로 부르도록)
    // [문법] promise.catch(함수): 실패했을 때만 함수를 실행한다. 실패한 기록을 지워 다음에 다시 시도하게 한다
    promise.catch(() => mealInfoCache.delete(date));
    // [문법] set(키, 값): 표에 저장
    mealInfoCache.set(date, promise);
  }
  // [문법] get(키): 저장해 둔 Promise를 꺼내 돌려준다
  return mealInfoCache.get(date);
}

/**
 // [문법] @typedef: JSDoc에서 '이런 모양의 객체를 Review라고 부르겠다'고 이름을 붙이는 문법
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
