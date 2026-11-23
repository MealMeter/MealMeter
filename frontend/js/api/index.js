// ============================================================================
// 📄 api/index.js — 서버에 부탁할 수 있는 일 "메뉴판"                           담당: 조현우
// ============================================================================
//
// 🍽️ 비유로 이해하기
//   client.js의 request()가 "점원"이라면, 이 파일은 점원에게 할 수 있는 주문을 정리한 "메뉴판"이다.
//   화면 코드(pages/*.js)는 주소('/api/...')를 직접 외울 필요 없이 메뉴판에서 고르기만 하면 된다.
//     예) 순위가 필요하면 → getRanking()
//         평가를 등록하려면 → createReview({ ... })
//   나중에 서버 주소가 바뀌어도 이 파일만 고치면 모든 페이지가 그대로 동작한다.
//
// 📦 메뉴판 (이 파일이 내보내는 함수 5개 + 1)
//   1.  getTodayMenus(식사코드)                  → 오늘 조식/중식/석식 메뉴 목록
//   2.  getMenuReviews(메뉴번호)                 → 메뉴 하나의 정보 + 평가 목록
//   3.  createReview(평가객체)                   → 새 평가 등록
//   3-1 updateReviewRating(평가번호, 별점, 토큰) → 내가 남긴 평가의 별점 고치기
//   4.  getRanking()                             → 인기 순위
//   5.  getMealInfo(날짜)                        → 칼로리·영양소·알레르기 (나이스에서 가져옴)
//
// 💡 모든 함수가 Promise를 돌려준다
//   서버 답장은 바로 오지 않으니까 "나중에 결과를 줄게"라는 약속표(Promise)가 먼저 온다.
//   그래서 쓰는 쪽에서는 꼭 await를 붙인다.  예) const data = await getRanking();
//   실패하면 Error가 던져지므로 try/catch로 감싸서 err.message를 화면에 보여 준다.
//
// 💡 /** ... */ 주석(JSDoc)
//   함수 위의 @param(받는 값), @returns(돌려주는 값) 설명은 편집기(VS Code)가 읽어서
//   함수에 마우스를 올리면 "이 함수는 이런 모양 데이터를 줘요"라고 보여 준다. 실행에는 영향 없다.
// ============================================================================

// [문법] import { 이름 } from './파일.js': 같은 폴더(./)의 다른 파일이 export한 것을 가져온다
import { request } from './client.js'; // 우리 서버에 요청 보내는 점원
import { fetchMealInfo } from './neis.js'; // 나이스(교육청) 급식 정보 가져오는 함수

/**
 * 1. 오늘의 메뉴 조회 — GET /api/menus/today
 *
 * 예) getTodayMenus(2) → 오늘 중식 메뉴들
 *     { date: "2026-10-27", mealType: "중식",
 *       menus: [ { menuId: 3, name: "닭갈비", averageRating: 4.5, reviewCount: 2 }, ... ] }
 *
 * @param {number} mealCode 1 조식 / 2 중식 / 3 석식
 * @returns {Promise<{ date: string, mealType: string,
 *   menus: { menuId: number, name: string, averageRating: number, reviewCount: number }[] }>}
 */
export function getTodayMenus(mealCode) {
  // 주소 뒤에 "?이름=값"을 붙이면 서버에 추가 조건을 알려 줄 수 있다(쿼리 문자열)
  // mealCode가 2면 실제 주소는 '/api/menus/today?mealCode=2'
  // [문법] `글자 ${값} 글자`: 백틱(`) 글자 안의 ${ } 자리에 변수 값이 들어간다(템플릿 리터럴)
  return request(`/api/menus/today?mealCode=${mealCode}`);
}

/**
 * 2. 메뉴별 평가 목록 조회 — GET /api/menus/{menuId}/reviews
 *
 * 예) getMenuReviews(3) → 3번 메뉴(닭갈비)의 정보와 지금까지 쌓인 평가들
 *
 * @returns {Promise<{ menuId: number, name: string, date: string, averageRating: number,
 *   reviewCount: number, reviews: Review[] }>}
 */
export function getMenuReviews(menuId) {
  // menuId가 3이면 '/api/menus/3/reviews'
  return request(`/api/menus/${menuId}/reviews`);
}

/**
 * 3. 평가 등록 — POST /api/reviews
 *
 * 예) createReview({ menuId: 3, rating: 5, saltiness: '짜다', portion: null, ..., comment: '맛있어요' })
 *     → 서버가 저장한 평가를 돌려준다 (평가 번호 reviewId, 작성 시각 createdAt, 수정용 editToken 포함)
 *
 * 실패하면 서버가 보낸 한 줄 메시지를 담은 Error를 던진다. 예) "욕설이나 비방 표현은 등록할 수 없어요."
 *
 * 🔑 editToken이란?
 *   로그인이 없는 서비스라서 "이 평가를 쓴 사람이 나"라는 걸 증명할 방법이 필요하다.
 *   서버는 평가를 등록할 때 딱 한 번 비밀 열쇠(editToken)를 준다. 이 열쇠를 가진 사람만 별점을 고칠 수 있다.
 *   (평가 목록을 불러올 때는 절대 안 준다 → 남의 평가는 못 고친다)
 *
 * @param {{ menuId: number, rating: number, saltiness: string|null, portion: string|null,
 *   temperature: string|null, texture: string|null, hygiene: string|null, comment: string }} review
 * @returns {Promise<Review & { editToken: string }>} 등록된 평가 (reviewId, createdAt 포함).
 *   editToken은 이 응답에만 오는 수정용 비밀 값이다. 별점을 고치려면 저장해 둔다
 */
export function createReview(review) {
  // 'POST' = "새로 하나 만들어 주세요"라는 요청. review 객체가 편지 본문으로 들어간다
  return request('/api/reviews', 'POST', review);
}

/**
 * 3-1. 별점 수정 — PATCH /api/reviews/{reviewId}
 *
 * 예) updateReviewRating(100, 2, 'tok101') → 100번 평가의 별점을 2점으로 고친다
 *
 * 등록할 때 받은 editToken(비밀 열쇠)이 맞아야 고칠 수 있다. 실패하면 서버 메시지를 담은 Error를 던진다.
 * @param {number} reviewId 고칠 평가 번호
 * @param {number} rating 새 별점 1~5
 * @param {string} editToken 등록할 때 받은 비밀 열쇠
 * @returns {Promise<Review>} 고친 평가
 */
export function updateReviewRating(reviewId, rating, editToken) {
  // 'PATCH' = "이미 있는 것의 일부만 고쳐 주세요"라는 요청
  // 보내는 내용은 { rating: 2, editToken: 'tok101' } 모양
  return request(`/api/reviews/${reviewId}`, 'PATCH', { rating: rating, editToken: editToken });
}

/**
 * 4. 인기 순위 조회 — GET /api/ranking
 *
 * 예) [ { rank: 1, name: "닭갈비", averageRating: 4.5, reviewCount: 3,
 *         topTags: [ { category: "간", value: "짜다" } ] }, ... ]
 *
 * 받은 데이터 모양이 이상하면(서버 버그 등) 화면이 깨지지 않게 미리 검사해서 오류로 알려 준다.
 *
 * @returns {Promise<{ rank: number, name: string, averageRating: number, reviewCount: number,
 *   topTags: { category: string, value: string }[] }[]>}
 */
export async function getRanking() {
  // 서버에서 순위 목록을 받아 온다 (실패하면 request가 오류를 던져서 여기서 바로 끝난다)
  const items = await request('/api/ranking');

  // 검사 1: 순위는 "목록(배열)"이어야 한다
  // [문법] Array.isArray(값): 값이 배열이면 true. 앞에 ! 를 붙여 "배열이 아니면"
  if (!Array.isArray(items)) {
    throw new Error('순위 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  // 검사 2: 목록 안의 한 줄 한 줄이 모두 올바른 모양이어야 한다
  // [문법] for (const item of items): items 배열에서 하나씩 꺼내 item이라는 이름으로 반복한다
  //        items가 [A, B, C]면 → item = A로 한 번, B로 한 번, C로 한 번 안쪽을 실행
  for (const item of items) {
    // 하나라도 이상하면 바로 오류 (나머지는 볼 필요 없음)
    if (!isRankingItem(item)) {
      throw new Error('순위 응답을 읽지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  // 검사를 모두 통과한 목록만 돌려준다
  return items;
}

// ----------------------------------------------------------------------------
// isRankingItem(item) — 순위 한 줄이 올바른 모양인지 검사한다 (이 파일 안에서만 쓰는 도우미)
//
//   올바른 모양: { rank: 1 이상 정수, name: 글자, averageRating: 숫자,
//                 reviewCount: 0 이상 정수, topTags: [ { category: 글자, value: 글자 }, ... ] }
//   돌려주는 값: 올바르면 true, 하나라도 틀리면 false
//
//   💡 방식: 틀린 걸 발견하는 즉시 return false 로 끝낸다. 끝까지 살아남으면 return true.
// ----------------------------------------------------------------------------
// [문법] export가 없는 함수 = 이 파일 안에서만 쓰는 함수(다른 파일에서 import 못 함)
function isRankingItem(item) {
  // 아예 값이 없으면(null, undefined) 탈락
  if (!item) return false;

  // rank(순위)는 1, 2, 3 같은 양의 정수여야 한다
  // [문법] Number.isInteger(값): 정수(소수점 없는 숫자)면 true.  || : "또는"(둘 중 하나라도 참이면 참)
  if (!Number.isInteger(item.rank) || item.rank <= 0) return false;

  // name(메뉴 이름)은 글자여야 한다
  // [문법] typeof 값: 값의 종류를 글자로 알려 준다. 'string'(글자), 'number'(숫자), 'object'(객체) 등
  if (typeof item.name !== 'string') return false;

  // averageRating(평균 별점)은 진짜 숫자여야 한다
  // [문법] Number.isFinite(값): NaN(숫자 아님)이나 무한대가 아닌 "정상 숫자"면 true
  if (!Number.isFinite(item.averageRating)) return false;

  // reviewCount(평가 수)는 0 이상의 정수여야 한다
  if (!Number.isInteger(item.reviewCount) || item.reviewCount < 0) return false;

  // topTags(많이 고른 태그)는 배열이어야 하고...
  if (!Array.isArray(item.topTags)) return false;
  // ...그 안의 태그 하나하나가 { category: 글자, value: 글자 } 모양이어야 한다
  for (const tag of item.topTags) {
    if (!tag || typeof tag.category !== 'string' || typeof tag.value !== 'string') return false;
  }

  // 모든 검사를 통과했다!
  return true;
}

// ----------------------------------------------------------------------------
// 나이스 정보 "기억 상자"(캐시)
//
//   메인 페이지에서 조식/중식/석식 탭을 왔다 갔다 할 때마다 나이스에 다시 물어보면 느리고,
//   나이스는 하루에 부를 수 있는 횟수도 정해져 있다.
//   그래서 한 번 물어본 날짜의 결과는 이 상자에 넣어 두고, 다음엔 상자에서 꺼내 쓴다.
//
//   모양 예) { '2026-10-27': (그날 나이스 정보를 가져오는 Promise) }
// ----------------------------------------------------------------------------
// [문법] {}: 빈 객체. mealInfoCache['2026-10-27'] = 값 처럼 "날짜 글자"를 이름표(키)로 써서 넣고 꺼낸다
const mealInfoCache = {};

/**
 * 5. 그날 급식의 칼로리·영양소·알레르기 — 나이스 급식 API (우리 서버를 거치지 않는다)
 *
 * 예) await getMealInfo('2026-10-27')
 *     → { 1: 조식 정보, 2: 중식 정보, 3: 석식 정보 }  (정보 모양은 neis.js의 MealInfo 참고)
 *
 * ⚠️ 실패하면 Error를 던진다. 하지만 이 정보는 "있으면 좋은" 덤일 뿐이라,
 *    페이지는 실패해도 메뉴 보기·평가하기를 계속할 수 있어야 한다.
 * 메뉴 하나 찾기는 neis.js의 findDish(그끼니정보, 메뉴이름)를 쓴다.
 *
 * @param {string} date "2026-10-27" (getTodayMenus나 getMenuReviews가 준 date)
 * @returns {Promise<Record<number, import('./neis.js').MealInfo>>} 식사 코드(1·2·3) → 정보
 */
export function getMealInfo(date) {
  // 상자에 이 날짜가 아직 없을 때만 나이스에 새로 물어본다
  if (!mealInfoCache[date]) {
    // 💡 결과가 아니라 "Promise(약속표)"를 저장한다.
    //    그러면 첫 요청이 아직 끝나기 전에 같은 날짜를 또 불러도, 같은 약속표를 받아서 요청이 한 번만 나간다.
    const promise = fetchMealInfo(date);

    // 실패한 결과는 기억하지 않는다. (기억해 두면 "다시 시도"를 눌러도 계속 실패한 결과만 나오니까)
    // [문법] promise.catch(함수): 약속이 "실패"로 끝났을 때만 함수를 실행한다
    // [문법] delete 객체[키]: 객체에서 그 이름표와 값을 지운다
    promise.catch(function () {
      delete mealInfoCache[date];
    });

    // 상자에 넣어 둔다
    mealInfoCache[date] = promise;
  }
  // 새로 넣었든 원래 있었든, 상자에 든 약속표를 돌려준다
  return mealInfoCache[date];
}

/**
 * Review — 평가 한 건의 모양 (위 함수들의 설명에서 "Review"라고 부르는 것)
 *
 * 태그 항목(간·양·온도·식감·위생)은 안 골랐으면 null이다.
 * 예) { reviewId: 1, menuId: 3, rating: 5, saltiness: '짜다', portion: null, temperature: null,
 *       texture: null, hygiene: null, comment: '맛있어요', createdAt: '2026-10-27T03:00:00.000Z' }
 *
 * @typedef {object} Review
 * @property {number} reviewId 평가 번호
 * @property {number} menuId 어느 메뉴의 평가인지
 * @property {number} rating 1~5
 * @property {string|null} saltiness 간
 * @property {string|null} portion 양
 * @property {string|null} temperature 온도
 * @property {string|null} texture 식감
 * @property {string|null} hygiene 위생
 * @property {string} comment 안 쓰면 빈 문자열
 * @property {string} createdAt ISO 날짜·시각 (끝의 Z = 세계 표준시. 화면에서는 한국 시간으로 바꿔 보여 준다)
 */
