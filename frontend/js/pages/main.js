// ============================================================================
// 📄 main.js — 메인 페이지(index.html) "오늘의 메뉴" 동작  (명세서 3장 기능 1)    담당: 김태건
// ============================================================================
//
// 🍱 이 페이지에서 사용자가 할 수 있는 일
//   1) [조식] [중식] [석식] 탭을 눌러 끼니별 메뉴 보기 (키보드 ← → Home End 로도 이동)
//   2) 메뉴 옆 별(☆☆☆☆☆)을 눌러 바로 별점 남기기 → 누르는 즉시 서버에 등록!
//      이미 남긴 메뉴는 다른 별을 눌러 별점을 "고칠" 수 있다
//   3) [알레르기 확인] 버튼으로 알레르기 정보 열고 닫기
//   4) 메뉴 이름을 눌러 상세 페이지(menu.html)로 가서 태그·의견까지 남기기
//   (아래쪽 "오늘 인기 TOP 3"은 todayTop.js가 따로 그린다)
//
// 🔄 페이지를 열면 일어나는 일 (맨 아래 start 함수)
//   1) 지금 시각에 맞는 탭을 고른다 (아침이면 조식, 점심이면 중식...)
//   2) 서버에서 조식·중식·석식 메뉴를 "동시에" 불러온다 (하나가 실패해도 나머지는 보여 준다)
//   3) 고른 끼니의 메뉴 목록을 그린다
//   4) 나이스에서 칼로리·알레르기를 받아 와서 덧붙인다 (실패해도 메뉴·평가는 그대로 동작)
//
// 🧠 "상태"와 "다시 그리기" — 이 파일을 이해하는 핵심 ⭐
//   이 페이지는 몇 가지 값(meals, selected, info...)을 기억하고 있다. 이걸 "상태"라고 부른다.
//   무언가 바뀌면(탭 클릭, 데이터 도착) → ① 상태 값을 바꾸고 → ② render 함수로 화면을 다시 그린다.
//     renderTabs()  : 탭 3개 (선택 표시, 칼로리 글자)
//     renderPanel() : 고른 끼니의 내용 (불러오는 중 / 오류 / 급식 없음 / 메뉴 목록)
//     renderTop()   : 오늘 인기 TOP 3
//   화면을 직접 조금씩 고치지 않고 "상태 → 다시 그리기"로 하면 화면과 데이터가 어긋날 일이 적다.
//
// 💾 바로 남긴 별점은 브라우저에 기억한다 (localStorage)
//   로그인이 없어서, 새로고침해도 "내가 이 메뉴에 4점 줬다"는 걸 기억하려면 브라우저에 저장해야 한다.
//   저장 모양: { "3": { rating: 4, reviewId: 100, editToken: "비밀열쇠" }, ... }   (이름표 = 메뉴 번호)
// ============================================================================

// [문법] import { 이름들 } from '경로': 다른 파일이 export한 함수·값을 가져온다
//        '../' = 한 단계 위 폴더(js/),  './' = 같은 폴더(js/pages/)
import { createReview, getMealInfo, getTodayMenus, updateReviewRating } from '../api/index.js'; // 서버 부르기
import { findDish } from '../api/neis.js'; // 나이스 정보에서 메뉴 찾기
import { MEAL_TYPES, RATING_LABELS } from '../api/reviewFields.js'; // 식사 이름, 별점 말
import { escapeHtml, formatDate } from '../common/format.js'; // 안전한 글자, 날짜 글자
import { renderEmpty, renderError, renderLoading } from '../common/state.js'; // 상태 화면
import { dishIcon } from '../common/ui.js'; // 메뉴 그림 글자
import { renderTodayTop } from './todayTop.js'; // TOP 3 그리기

// ---------- 바뀌지 않는 설정값 ----------
const MEAL_CODES = [1, 2, 3]; // 1 조식 / 2 중식 / 3 석식
const RATED_KEY = 'mealmeter-quick-ratings'; // 바로 남긴 별점을 저장하는 브라우저 저장소 이름표
const MOCK_REVIEWS_KEY = 'mealmeter-mock-reviews-v2'; // 예전 "가짜 서버" 시절에 쓰던 저장소 이름표 (정리용)

// ---------- HTML에서 내용을 채울 자리 찾아 두기 ----------
// 매번 찾으면 번거로우니 처음에 한 번 찾아서 변수에 담아 둔다
// [문법] document.getElementById('id'): HTML에서 그 id를 가진 요소 하나를 찾는다
const dateText = document.getElementById('today-date'); // "10월 27일 화요일" 글자 자리
const tabList = document.getElementById('meal-tabs'); // 탭 3개를 감싼 묶음
// 탭 버튼 3개 [조식, 중식, 석식]
// [문법] querySelectorAll('선택자'): 선택자에 맞는 요소를 "전부" 찾는다 ([role="tab"] = role 속성이 tab인 것)
// [문법] Array.from(...): 찾은 결과를 진짜 배열로 바꾼다 (그래야 indexOf 같은 배열 기능을 쓸 수 있다)
const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
const panel = document.getElementById('meal-panel'); // 고른 끼니의 내용이 들어갈 자리
const topList = document.getElementById('today-top-list'); // TOP 3 자리

// ---------- 페이지가 기억하는 값 (상태) ----------
// [문법] let: 나중에 값을 바꿀 수 있는 변수
//
// meals: 끼니별 데이터. 끼니마다 셋 중 하나의 상태다
//   meals[2] === undefined           → 아직 불러오는 중
//   meals[2] = { menus: [...] }      → 성공 (menus가 빈 배열 []이면 "급식 없음")
//   meals[2] = { error: '메시지' }   → 실패
let meals = {};
let date = null; // 서버가 알려 준 오늘 날짜 "2026-10-27". 모르면 null
let info = null; // 나이스 정보 { 1: 조식정보, 2: 중식정보, 3: 석식정보 }. 아직 없거나 실패하면 null
let infoFailed = false; // 나이스 정보를 불러오다 실패했는지 (실패하면 "못 불러왔어요" 안내를 보여 준다)
let selected = null; // 지금 고른 탭의 식사 번호 (1, 2, 3)

// ============================================================================
// 💾 바로 남긴 별점 기억하기 (브라우저 저장소 localStorage)
// ============================================================================
// 💡 localStorage란?
//   브라우저 안의 작은 "메모장". 이름표(키)와 글자를 저장하면 페이지를 닫았다 열어도 남아 있다.
//   글자만 저장할 수 있어서 객체는 JSON.stringify로 글자로 바꿔 넣고, JSON.parse로 다시 객체로 꺼낸다.
//   ⚠️ 비공개 창 등에서는 저장소를 못 쓸 수도 있어서 항상 try/catch로 감싼다.

// ----------------------------------------------------------------------------
// loadMockTokens() — 예전 "가짜 서버"가 만들었던 수정 열쇠(editToken) 목록을 꺼낸다
//
//   🤔 왜 필요할까?
//     개발 초기에는 진짜 서버 없이 브라우저 안의 가짜 서버로 테스트했다.
//     그때 남긴 별점 기록에는 가짜 열쇠가 들어 있는데, 진짜 서버에 보내면 "열쇠가 틀려요" 오류가 난다.
//     그래서 가짜 열쇠 목록을 알아내서, 아래 loadRated에서 그 기록을 골라 버린다.
//   돌려주는 값: 가짜 열쇠 글자들의 배열. 예) ['mock-abc', 'mock-def']  (없으면 [])
// ----------------------------------------------------------------------------
function loadMockTokens() {
  const tokens = [];
  try {
    // 예전 가짜 평가 목록을 꺼낸다
    // [문법] localStorage.getItem(이름표): 저장된 글자를 꺼낸다(없으면 null)
    // [문법] JSON.parse(글자): JSON 글자 → 객체/배열.  JSON.parse(null) → null
    const mockReviews = JSON.parse(localStorage.getItem(MOCK_REVIEWS_KEY));
    // 배열일 때만 하나씩 보면서 열쇠를 모은다
    if (Array.isArray(mockReviews)) {
      for (const review of mockReviews) {
        if (review && review.editToken) tokens.push(review.editToken);
      }
    }
  } catch (err) {
    // 예전 가짜 데이터가 깨져 있어도 괜찮다. 진짜 별점 기록은 계속 읽어야 하니 조용히 넘어간다
  }
  return tokens;
}

// ----------------------------------------------------------------------------
// loadRated() — 이 브라우저에서 바로 남긴 별점 기록을 꺼낸다
//
//   돌려주는 값: { 메뉴번호: { rating, reviewId, editToken } }
//   예)        { "3": { rating: 4, reviewId: 100, editToken: "tok101" } }
//
//   같은 메뉴의 별을 다시 누르면 새 평가를 만들지 않고, 여기 기억해 둔 평가(reviewId)의 별점을 고친다
//
//   정리 작업도 함께 한다:
//     - 아주 예전 형식 { "3": 4 } (숫자만 저장)  → { "3": { rating: 4 } } 로 바꾼다 (열쇠가 없어서 별점만 기억)
//     - 가짜 서버 열쇠를 가진 기록              → 지운다
// ----------------------------------------------------------------------------
function loadRated() {
  try {
    let saved = JSON.parse(localStorage.getItem(RATED_KEY));
    // 저장된 게 없거나(null) 객체가 아니면(이상한 값) 빈 객체로 새로 시작한다
    // [문법] typeof 값: 값의 종류 글자. 객체는 'object'
    if (!saved || typeof saved !== 'object') saved = {};

    const mockTokens = loadMockTokens();
    // 기록을 하나씩 보면서 정리한다
    // [문법] for (const 키 in 객체): 객체의 이름표(키)를 하나씩 꺼내 반복한다. 여기서 키 = 메뉴 번호
    for (const menuId in saved) {
      const value = saved[menuId];
      if (typeof value === 'number') {
        // 예전 형식(숫자만) → 새 형식(객체)으로
        saved[menuId] = { rating: value };
      } else if (value && mockTokens.includes(value.editToken)) {
        // 가짜 열쇠 기록은 지운다
        // [문법] delete 객체[키]: 그 이름표와 값을 지운다
        delete saved[menuId];
      }
    }
    return saved;
  } catch (err) {
    // 저장소를 못 쓰는 환경(비공개 창 등)이면 기억 없이 빈 기록으로 동작한다
    return {};
  }
}
// 페이지가 열릴 때 한 번 꺼내서 rated에 담아 둔다. 이후 별점을 남기면 rated를 고치고 saveRated()로 저장한다
const rated = loadRated();

// rated(별점 기록)를 브라우저 저장소에 저장한다
function saveRated() {
  try {
    // [문법] localStorage.setItem(이름표, 글자): 저장. 객체는 JSON.stringify로 글자로 바꿔서 넣는다
    localStorage.setItem(RATED_KEY, JSON.stringify(rated));
  } catch (err) {
    // 저장에 실패해도(저장소 꽉 참 등) 지금 화면에서는 계속 동작한다. 새로고침하면 잊어버릴 뿐
  }
}

// ----------------------------------------------------------------------------
// myRatingOf(menuId) — 이 메뉴에 내가 남긴 별점 (안 남겼으면 0)
//   예) myRatingOf(3) → 4,  myRatingOf(99) → 0
// ----------------------------------------------------------------------------
function myRatingOf(menuId) {
  const mine = rated[menuId];
  if (mine && mine.rating) return mine.rating;
  return 0;
}

// ----------------------------------------------------------------------------
// mealByTime() — 지금 시각에 맞는 끼니 번호
//   0시~8시 59분 → 1(조식),  9시~13시 59분 → 2(중식),  14시 이후 → 3(석식)
// ----------------------------------------------------------------------------
function mealByTime() {
  // [문법] new Date(): 지금 날짜·시각.  .getHours(): 그중 '시'(0~23)
  const hour = new Date().getHours();
  // 위에서부터 차례로 검사해서 맞으면 바로 돌려주고 끝
  if (hour < 9) return 1;
  if (hour < 14) return 2;
  return 3;
}

// ============================================================================
// 🗂️ 식사 탭 [조식] [중식] [석식]
// ============================================================================

// ----------------------------------------------------------------------------
// hasMenus(code) — 그 끼니에 메뉴가 하나라도 있는지
//   불러오는 중·실패·급식 없음이면 false
// ----------------------------------------------------------------------------
function hasMenus(code) {
  const meal = meals[code];
  // meal이 있고 → menus가 있고 → 메뉴가 1개 이상이면 true
  // [문법] Boolean(값): 참/거짓(true/false)으로 바꾼다. undefined 같은 값도 깔끔하게 false가 된다
  return Boolean(meal && meal.menus && meal.menus.length > 0);
}

// ----------------------------------------------------------------------------
// isEmptyMeal(code) — 그 끼니가 "급식 없음"이라고 확실히 아는지
//
//   이게 true인 탭은 눌러 봐야 볼 게 없으니 막아 둔다(disabled).
//   ⚠️ 불러오기에 "실패한" 탭은 막지 않는다! 눌러서 [다시 시도]를 할 수 있어야 하니까.
// ----------------------------------------------------------------------------
function isEmptyMeal(code) {
  const meal = meals[code];
  return Boolean(meal && meal.menus && meal.menus.length === 0);
}

// ----------------------------------------------------------------------------
// infoOf(code) — 그 끼니의 나이스 정보 (칼로리·영양소·메뉴별 알레르기). 없으면 null
// ----------------------------------------------------------------------------
function infoOf(code) {
  if (info && info[code]) return info[code];
  return null;
}

// ----------------------------------------------------------------------------
// tabSubText(code) — 탭 이름 아래 작은 글자
//
//   불러오는 중 → '…'          실패      → '불러오기 실패'     급식 없음 → '없음'
//   칼로리 앎   → '812 kcal'   칼로리 모름 → '6가지' (메뉴 개수)
// ----------------------------------------------------------------------------
function tabSubText(code) {
  const meal = meals[code];
  if (!meal) return '…';
  if (meal.error) return '불러오기 실패';
  if (isEmptyMeal(code)) return '없음';
  const mealInfo = infoOf(code);
  if (mealInfo && mealInfo.kcal) {
    // [문법] Math.round(812.3) → 812 (반올림)
    return `${Math.round(mealInfo.kcal)} kcal`;
  }
  return `${meal.menus.length}가지`;
}

// ----------------------------------------------------------------------------
// renderTabs() — 탭 3개를 지금 상태(selected, meals, info)에 맞게 다시 그린다
//
//   탭마다 정하는 것: 선택됐는지(aria-selected) / Tab 키로 들어올 수 있는지(tabIndex)
//                    / 막혔는지(disabled) / 아래 작은 글자
// ----------------------------------------------------------------------------
function renderTabs() {
  for (const tab of tabs) {
    // 이 탭이 몇 번 끼니인지. HTML에 <button data-meal="2"> 처럼 적혀 있다
    // [문법] 요소.dataset.meal: HTML의 data-meal 속성 값(글자 '2'). Number로 숫자 2로 바꾼다
    const code = Number(tab.dataset.meal);
    const on = code === selected; // 지금 고른 탭이면 true

    // 낭독기에게 "선택됨/선택 안 됨"을 알려 주고, CSS도 이걸 보고 고른 탭을 강조한다
    // [문법] 요소.setAttribute(이름, 값): HTML 속성을 정한다. 값은 글자여야 해서 String(true) → 'true'
    tab.setAttribute('aria-selected', String(on));

    // ⌨️ 키보드 규칙 (탭 메뉴의 표준 방식)
    //   Tab 키를 누르면 "고른 탭" 하나에만 들어오고, 탭끼리는 ← → 화살표로 옮겨 다닌다
    // [문법] tabIndex = 0: Tab 키 순서에 들어감 / -1: 안 들어감(코드로 focus()만 가능)
    if (on) {
      tab.tabIndex = 0;
    } else {
      tab.tabIndex = -1;
    }

    // "급식 없음"이 확실한 탭은 막는다. 단, 지금 고른 탭은 막지 않는다
    // [문법] 버튼.disabled = true: 버튼을 누를 수 없게 한다
    tab.disabled = isEmptyMeal(code) && !on;

    // 탭 안의 작은 글자 자리에 '812 kcal' 같은 글자를 넣는다
    // [문법] 요소.textContent = 글자: HTML로 해석하지 않고 순수 글자로 넣는다(안전)
    tab.querySelector('.meal-tabs__sub').textContent = tabSubText(code);
  }
  // 내용 영역의 이름을 "고른 탭의 글자"로 정한다 → 낭독기가 "중식 탭 패널"처럼 읽어 준다
  // [문법] aria-labelledby="id": 이 영역의 이름은 그 id 요소의 글자라는 뜻
  panel.setAttribute('aria-labelledby', `meal-tab-${selected}`);
}

// ----------------------------------------------------------------------------
// selectMeal(code, moveFocus) — 탭을 바꾼다
//
//   code     : 고를 끼니 번호
//   moveFocus: true면 키보드 포커스도 새 탭으로 옮긴다 (화살표 키로 옮겼을 때)
//              마우스로 눌렀을 땐 이미 거기 있으니 false
// ----------------------------------------------------------------------------
function selectMeal(code, moveFocus) {
  selected = code; // ① 상태 바꾸기
  renderTabs(); // ② 다시 그리기
  renderPanel();
  if (moveFocus) {
    // [문법] 요소.focus(): 그 요소로 키보드 포커스(지금 선택된 곳 표시)를 옮긴다
    document.getElementById(`meal-tab-${code}`).focus();
  }
}

// ----------------------------------------------------------------------------
// setupTabs() — 탭 클릭·키보드 동작을 연결한다 (페이지 열 때 한 번)
//
//   💡 이벤트 위임: 탭 3개에 각각 연결하지 않고, 탭들을 감싼 묶음(tabList) 하나에만 연결한다.
//      안쪽 아무 데나 누르면 묶음까지 알림이 올라오니까(이벤트 버블링), 거기서 "어느 탭인지"만 찾으면 된다.
// ----------------------------------------------------------------------------
function setupTabs() {
  // 🖱️ 클릭
  // [문법] addEventListener('click', 함수): 클릭할 때마다 함수 실행. event에 클릭 정보가 담겨 온다
  tabList.addEventListener('click', function (event) {
    // 누른 곳에서 가장 가까운 탭 버튼 찾기 (탭 안의 작은 글자를 눌렀어도 탭 버튼을 찾아 준다)
    // [문법] event.target: 실제로 누른 요소
    // [문법] 요소.closest(선택자): 자기 자신부터 위(부모)로 올라가며 선택자에 맞는 첫 요소를 찾는다(없으면 null)
    const tab = event.target.closest('[role="tab"]');
    // 탭을 눌렀고, 막힌 탭이 아니면 그 탭으로 바꾼다
    if (tab && !tab.disabled) {
      selectMeal(Number(tab.dataset.meal), false);
    }
  });

  // ⌨️ 키보드: ← → Home End 로 탭 옮기기 (막힌 탭은 건너뛴다)
  // [문법] 'keydown': 키보드 키를 누를 때 일어나는 일
  tabList.addEventListener('keydown', function (event) {
    // 누를 수 있는(막히지 않은) 탭만 모은다. 예) 조식이 없으면 [중식, 석식]
    const usable = [];
    for (const tab of tabs) {
      if (!tab.disabled) usable.push(tab);
    }
    // 지금 포커스가 있는 탭이 usable에서 몇 번째인지
    // [문법] document.activeElement: 지금 키보드 포커스가 있는 요소
    // [문법] 배열.indexOf(값): 그 값이 몇 번째 칸인지(0부터). 없으면 -1
    const index = usable.indexOf(document.activeElement);
    if (index === -1) return; // 탭에 포커스가 없으면 아무것도 안 함

    // 누른 키에 따라 옮겨 갈 칸 번호(next)를 정한다
    // 끝에서 더 가면 반대쪽 끝으로 돌아간다 (석식에서 → 누르면 조식으로)
    // [문법] event.key: 누른 키 이름. 'ArrowRight'(→), 'ArrowLeft'(←), 'Home', 'End' 등
    let next;
    if (event.key === 'ArrowRight') {
      next = index + 1; // 오른쪽 칸
      if (next === usable.length) next = 0; // 끝을 넘어가면 맨 처음으로
    } else if (event.key === 'ArrowLeft') {
      next = index - 1; // 왼쪽 칸
      if (next === -1) next = usable.length - 1; // 처음보다 앞이면 맨 끝으로
    } else if (event.key === 'Home') {
      next = 0; // 맨 처음
    } else if (event.key === 'End') {
      next = usable.length - 1; // 맨 끝
    } else {
      return; // 다른 키(Enter, 글자 등)는 우리가 처리하지 않는다
    }
    // 화살표 키를 누르면 원래 화면이 스크롤되는데, 그걸 막는다
    // [문법] event.preventDefault(): 브라우저가 원래 하려던 동작을 막는다
    event.preventDefault();
    // 그 탭으로 바꾸고 포커스도 옮긴다(true)
    selectMeal(Number(usable[next].dataset.meal), true);
  });
}

// ============================================================================
// 📋 메뉴 목록 (고른 끼니의 내용)
// ============================================================================
// 💡 menu = 서버가 준 메뉴 하나 { menuId: 3, name: '닭갈비', averageRating: 4.5, reviewCount: 2 }

// ----------------------------------------------------------------------------
// scoreHtml(menu) — 메뉴 이름 옆 "★ 4.5 · 2명"
//   평가가 없으면 빈 글자 → 아무것도 안 보인다
// ----------------------------------------------------------------------------
function scoreHtml(menu) {
  if (menu.reviewCount === 0) return '';
  // 낭독기는 "평균 별점 4.5 · 2명"으로 읽는다 (★는 aria-hidden으로 숨김)
  return `
    <p class="dish__score">
      <span class="sr-only">평균 별점 </span><span class="dish__score-star" aria-hidden="true">★</span>
      <strong>${menu.averageRating.toFixed(1)}</strong> · ${menu.reviewCount}명
    </p>`;
}

// ----------------------------------------------------------------------------
// quickRateHtml(menu) — 바로 별점 남기기 버튼 5개 (☆☆☆☆☆)
//
//   - 별을 누르면 그 점수로 바로 등록된다 (quickRate 함수가 처리)
//   - 이미 남긴 메뉴는 내 별점만큼 꽉 찬 별(★★★★☆)로 보이고, 다른 별을 눌러 고칠 수 있다
//
//   🤔 왜 라디오 버튼이 아니라 일반 버튼일까?
//     라디오는 키보드 화살표만 눌러도 값이 바뀐다 → 구경하다가 실수로 별점이 등록될 수 있다.
//     버튼은 Enter/Space를 눌러야만 실행되니까 안전하다.
// ----------------------------------------------------------------------------
function quickRateHtml(menu) {
  const myRating = myRatingOf(menu.menuId); // 내가 남긴 별점 (없으면 0)

  let stars = '';
  // n = 1, 2, 3, 4, 5 로 별 버튼 5개를 만든다
  for (let n = 1; n <= 5; n += 1) {
    // 내 별점 이하인 별은 꽉 찬 별(★), 나머지는 빈 별(☆)
    let filledClass = '';
    let symbol = '☆';
    if (n <= myRating) {
      filledClass = ' is-filled';
      symbol = '★';
    }
    // [HTML] data-rating="${n}": 몇 번째 별인지 적어 둔다 → 누르면 dataset.rating으로 읽는다
    // [HTML] aria-pressed="true/false": "눌린 상태"인 별인지 낭독기에 알려 준다 (내 별점과 같은 별만 true)
    // [HTML] aria-label: 낭독기가 "4점, 좋아요"라고 읽는다
    stars += `
    <button type="button" class="quick-rate__star${filledClass}" data-rating="${n}"
      aria-pressed="${n === myRating}" aria-label="${n}점, ${RATING_LABELS[n]}">${symbol}</button>`;
  }

  // 별 5개 묶음의 이름. 이미 남겼으면 "닭갈비 내 별점 4점, 눌러서 바꾸기", 아니면 "닭갈비 별점 바로 남기기"
  let label = `${escapeHtml(menu.name)} 별점 바로 남기기`;
  if (myRating) {
    label = `${escapeHtml(menu.name)} 내 별점 ${myRating}점, 눌러서 바꾸기`;
  }
  // [HTML] role="group": 버튼 5개가 한 묶음이라고 낭독기에 알려 준다
  return `<div class="quick-rate" role="group" aria-label="${label}">${stars}</div>`;
}

// ----------------------------------------------------------------------------
// detailHref(menu) — 메뉴 상세(평가 작성) 페이지 주소
//   예) /menu.html?menuId=8&meal=2   (meal = 지금 고른 끼니. 상세 페이지에서 "중식" 표시에 쓴다)
// ----------------------------------------------------------------------------
function detailHref(menu) {
  // [문법] encodeURIComponent(값): 주소에 넣어도 안전한 글자로 바꾼다
  return `/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${selected}`;
}

// ----------------------------------------------------------------------------
// dishHtml(menu) — 메뉴 한 줄 HTML
//
//   ┌──────────────────────────────────────────────────┐
//   │ 🍗  닭갈비                         ★ 4.5 · 2명    │
//   │     (알레르기: 대두, 밀 — 처음엔 숨김)             │
//   │     ☆☆☆☆☆                     [알레르기 확인]    │
//   │     (오류가 나면 여기에 빨간 글자)                 │
//   └──────────────────────────────────────────────────┘
//
//   알레르기는 나이스 정보에서 "메뉴 이름"으로 찾는다. 못 찾으면 버튼 자체를 안 만든다.
// ----------------------------------------------------------------------------
function dishHtml(menu) {
  // 나이스 정보에서 이 메뉴를 찾아 알레르기 목록을 꺼낸다 (못 찾으면 빈 목록)
  let allergies = [];
  const dish = findDish(infoOf(selected), menu.name);
  if (dish) allergies = dish.allergies;

  // 알레르기가 있을 때만 [알레르기 확인] 버튼과 (숨겨 둔) 알레르기 글자를 만든다
  let allergyButton = '';
  let allergyText = '';
  if (allergies.length > 0) {
    // 버튼과 글자를 이어 줄 id. 예) 'allergy-3'
    const allergyId = `allergy-${menu.menuId}`;
    // [HTML] aria-expanded="false": 지금 닫혀 있다고 낭독기에 알려 준다 (열면 "true"로 바꾼다)
    // [HTML] aria-controls="id": 이 버튼이 여닫는 요소가 그 id라고 알려 준다
    allergyButton = `<button type="button" class="dish__allergy-toggle" aria-expanded="false" aria-controls="${allergyId}">알레르기 확인</button>`;
    // [HTML] hidden: 처음에는 숨겨 둔다
    // [문법] 배열.join(', '): 배열을 ', '로 이어 한 줄 글자로. ['대두', '밀'] → '대두, 밀'
    allergyText = `<p class="dish__allergy" id="${allergyId}" hidden><strong>알레르기</strong> ${escapeHtml(allergies.join(', '))}</p>`;
  }

  // [HTML] data-menu-id: 별을 눌렀을 때 "어느 메뉴의 별인지" 알려고 적어 둔다 (dataset.menuId로 읽음)
  // [HTML] .dish__status (role="status", sr-only): "4점 남겼어요" 같은 결과를 낭독기만 조용히 읽어 준다
  // [HTML] .dish__error  (role="alert"): 오류가 나면 여기에 글자를 넣고, 낭독기가 바로 읽어 준다
  return `
    <li class="dish" data-menu-id="${menu.menuId}">
      <span class="dish__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
      <div class="dish__body">
        <div class="dish__top">
          <h2 class="dish__name"><a href="${detailHref(menu)}">${escapeHtml(menu.name)}</a></h2>
          ${scoreHtml(menu)}
        </div>
        ${allergyText}
        <div class="dish__actions">
          <div class="dish__rate">${quickRateHtml(menu)}</div>
          <p class="dish__status sr-only" role="status"></p>
          ${allergyButton}
        </div>
        <p class="dish__error" role="alert"></p>
      </div>
    </li>`;
}

// 영양소 값을 글자로. 값이 있으면 '39.8g', 없으면(null) '-'
function gramsText(value) {
  if (value === null || value === undefined) return '-';
  return `${value}g`;
}

// 영양소 한 칸 HTML. 예) nutrientHtml('단백질', 39.8) → 단백질 39.8g
// [HTML] <dt>/<dd>: "설명 목록"의 용어(dt) - 설명(dd) 짝. 여기서는 영양소 이름 - 값
function nutrientHtml(name, value) {
  return `<div class="meal-card__nutrient"><dt>${name}</dt><dd>${gramsText(value)}</dd></div>`;
}

// ----------------------------------------------------------------------------
// summaryHtml(menus) — 메뉴 목록 위의 요약 줄
//
//   나이스 정보 있음:  중식 · 6가지   812.3 kcal      탄수화물 118.2g | 단백질 39.8g | 지방 -
//   나이스 정보 없음:  중식 · 6가지   (실패했으면 "칼로리·알레르기 정보를 불러오지 못했어요.")
// ----------------------------------------------------------------------------
function summaryHtml(menus) {
  const meal = infoOf(selected); // 이 끼니의 나이스 정보
  // "중식 · 6가지" 글자
  const label = `<p class="meal-card__label">${MEAL_TYPES[selected]} · ${menus.length}가지</p>`;

  // 나이스 정보가 없을 때: 끼니 이름과 가짓수만 (+ 실패했으면 안내)
  if (!meal) {
    let note = '';
    if (infoFailed) {
      note = '<p class="meal-card__note">칼로리·알레르기 정보를 불러오지 못했어요.</p>';
    }
    return `<div class="meal-card__summary"><div>${label}${note}</div></div>`;
  }

  // 나이스 정보가 있을 때: 영양소 3칸 + 칼로리
  const nutrients = nutrientHtml('탄수화물', meal.carb) + nutrientHtml('단백질', meal.protein) + nutrientHtml('지방', meal.fat);
  // 칼로리를 소수 첫째 자리 글자로 (없으면 '-')
  // [문법] toFixed(1): 812.34 → '812.3'
  let kcal = '-';
  if (meal.kcal !== null && meal.kcal !== undefined) {
    kcal = meal.kcal.toFixed(1);
  }
  return `
    <div class="meal-card__summary">
      <div>
        ${label}
        <p class="meal-card__kcal"><span class="meal-card__kcal-value">${kcal}</span> kcal</p>
      </div>
      <dl class="meal-card__nutrients">${nutrients}</dl>
    </div>`;
}

// ----------------------------------------------------------------------------
// renderPanel() — 고른 끼니의 내용 자리를 그린다
//
//   위에서부터 차례로 확인해서, 맞는 상황을 그리고 바로 return으로 끝낸다:
//     1) 아직 불러오는 중   → 빙글빙글
//     2) 불러오기 실패      → 오류 + [다시 시도] (이 끼니만 다시 불러온다)
//     3) 급식 없음          → "오늘은 급식이 없어요"
//     4) 메뉴 있음          → 요약 줄 + 메뉴 목록
// ----------------------------------------------------------------------------
function renderPanel() {
  const meal = meals[selected];
  // 1) 불러오는 중
  if (!meal) {
    renderLoading(panel, '급식표를 불러오는 중이에요…');
    return;
  }
  // 2) 실패
  if (meal.error) {
    // [다시 시도]를 누르면 실행할 함수를 넘긴다. 지금 바로 실행하는 게 아니다!
    renderError(panel, meal.error, function () {
      reloadMeal(selected);
    });
    return;
  }
  // 3) 급식 없음
  if (meal.menus.length === 0) {
    renderEmpty(panel, '오늘은 급식이 없어요', '<p class="small">주말이나 휴일에는 급식표가 올라오지 않아요. 인기 순위에서 지난 메뉴 평가를 볼 수 있어요.</p>');
    return;
  }

  // 4) 메뉴 있음: 메뉴마다 한 줄씩 HTML을 만들어 이어 붙인다
  let dishes = '';
  for (const menu of meal.menus) {
    dishes += dishHtml(menu);
  }
  // [문법] 요소.innerHTML = HTML글자: 안의 내용을 통째로 바꾼다
  panel.innerHTML = `
    <div class="meal-card">
      ${summaryHtml(meal.menus)}
      <ul class="dish-list">${dishes}</ul>
    </div>`;
}

// ============================================================================
// 🏆 오늘 인기 TOP 3
// ============================================================================
// 그리는 코드는 todayTop.js에 있다. 여기서는 지금 가진 메뉴 정보(meals)를 넘겨주기만 한다.
function renderTop() {
  renderTodayTop(topList, meals);
}

// ============================================================================
// ⭐ 별점 바로 남기기 · 알레르기 열고 닫기
// ============================================================================

// 지금 고른 끼니에서 메뉴 번호로 메뉴 객체를 찾는다 (못 찾으면 null)
function findMenu(menuId) {
  for (const menu of meals[selected].menus) {
    if (menu.menuId === menuId) return menu;
  }
  return null;
}

// 메뉴 한 줄(item) 안의 별 버튼 5개를 한꺼번에 막거나(true) 풀거나(false)
function setStarsDisabled(item, disabled) {
  const buttons = item.querySelectorAll('.quick-rate__star');
  for (const button of buttons) {
    button.disabled = disabled;
  }
}

// 소수 첫째 자리까지 반올림. 예) 4.25 → 4.3
// (10을 곱해 반올림한 뒤 다시 10으로 나누는 방법. 42.5 → 43 → 4.3)
function roundOne(value) {
  return Math.round(value * 10) / 10;
}

// ----------------------------------------------------------------------------
// quickRate(item, rating) — 별을 눌렀을 때 실행되는 핵심 함수 ⭐
//
//   item  : 누른 별이 들어 있는 메뉴 한 줄 <li class="dish">
//   rating: 누른 별 번호 (1~5)
//
//   🔄 흐름
//     1) 어느 메뉴인지 찾고, 내가 전에 남긴 별점이 있는지 확인
//        같은 별을 또 눌렀으면 할 일 없음 → 끝
//     2) 별 버튼을 잠깐 막는다 (서버 답장 오기 전에 또 누르면 두 번 등록되니까)
//     3) 서버에 보내기
//          처음 남기는 메뉴     → createReview (새 평가 등록, 별점만 있고 태그·의견은 비움)
//          이미 남긴 메뉴       → updateReviewRating (기억해 둔 평가의 별점만 고침)
//        실패하면 → 오류 글자 보여 주고, 별 버튼 다시 풀고 끝
//     4) 성공하면 → 평균 별점·평가 수를 직접 다시 계산 (서버에 다시 안 물어봐도 되게)
//     5) 내 별점 기록을 저장
//     6) 이 메뉴 한 줄만 새로 그리기 (목록 전체를 다시 그리면 포커스가 사라지니까)
//     7) TOP 3도 다시 그리기 (별점이 바뀌었으니 순위가 바뀔 수 있다)
// ----------------------------------------------------------------------------
// [문법] async function: 안에서 await로 서버 답장을 기다리는 함수
async function quickRate(item, rating) {
  // ── 1) 어느 메뉴인지, 전에 남긴 별점이 있는지 ──
  // HTML에 적어 둔 data-menu-id(글자)를 숫자로 바꿔서 찾는다
  const menu = findMenu(Number(item.dataset.menuId));
  const mine = rated[menu.menuId]; // 전에 남긴 기록 { rating, reviewId, editToken } 또는 undefined(처음)
  // 같은 별을 다시 누르면 바꿀 게 없으니 아무것도 안 한다
  if (mine && mine.rating === rating) return;

  // ── 2) 준비: 별 버튼 막기, 예전 오류 글자 지우기 ──
  const errorBox = item.querySelector('.dish__error');
  setStarsDisabled(item, true); // 두 번 누르기 방지
  errorBox.textContent = '';

  // "고치기"인지 "새로 등록"인지 정한다.
  // 평가 번호와 비밀 열쇠가 둘 다 있어야 고칠 수 있다 (아주 예전 기록은 열쇠가 없어서 새로 등록한다)
  let editing = false;
  if (mine && mine.reviewId && mine.editToken) {
    editing = true;
  }

  // ── 3) 서버에 보내기 ──
  let saved; // 새로 등록했을 때 서버가 돌려준 평가 (reviewId, editToken이 들어 있다)
  try {
    if (editing) {
      // 별점 고치기
      // [문법] await: 서버 답장이 올 때까지 기다린다. 실패하면 오류가 던져져 아래 catch로 간다
      await updateReviewRating(mine.reviewId, rating, mine.editToken);
    } else {
      // 새 평가 등록. 별점만 있는 평가라서 태그는 전부 null(안 고름), 의견은 빈 글자
      saved = await createReview({
        menuId: menu.menuId,
        rating: rating,
        saltiness: null,
        portion: null,
        temperature: null,
        texture: null,
        hygiene: null,
        comment: '',
      });
    }
  } catch (err) {
    // 실패: 서버가 보낸 이유를 그대로 보여 주고, 별 버튼을 다시 누를 수 있게 풀어 준다
    errorBox.textContent = err.message;
    setStarsDisabled(item, false);
    return;
  }

  // ── 4) 평균 별점·평가 수 다시 계산 (서버에 다시 묻지 않고 직접) ──
  // 원리: 평균 × 개수 = 합계.  예) 평균 4.5 × 2명 = 합계 9
  const total = menu.averageRating * menu.reviewCount;
  if (editing) {
    // 고치기: 사람 수는 그대로. 합계에서 예전 별점을 빼고 새 별점을 더한다
    //   예) 합계 9, 예전 4 → 새 2 : (9 - 4 + 2) / 2명 = 3.5
    menu.averageRating = roundOne((total - mine.rating + rating) / menu.reviewCount);
    mine.rating = rating; // 내 기록도 새 별점으로
  } else {
    // 새로 등록: 사람이 한 명 늘었다. 합계에 새 별점을 더하고 (사람 수 + 1)로 나눈다
    //   예) 합계 9, 새 3 : (9 + 3) / 3명 = 4.0
    menu.averageRating = roundOne((total + rating) / (menu.reviewCount + 1));
    menu.reviewCount += 1;
    // 다음에 고칠 수 있게 평가 번호와 비밀 열쇠를 기억해 둔다
    rated[menu.menuId] = { rating: rating, reviewId: saved.reviewId, editToken: saved.editToken };
  }

  // ── 5) 브라우저에 저장 ──
  saveRated();

  // ── 6) 이 메뉴 한 줄만 새로 그리기 ──
  // 별 버튼 5개를 새 별점에 맞게 다시 그린다
  item.querySelector('.dish__rate').innerHTML = quickRateHtml(menu);
  // "★ 4.5 · 2명" 글자는 지우고 새로 붙인다 (처음 평가라면 원래 없었으니 지울 것도 없다)
  const oldScore = item.querySelector('.dish__score');
  if (oldScore) oldScore.remove(); // [문법] 요소.remove(): 화면에서 그 요소를 지운다
  // [문법] insertAdjacentHTML('beforeend', HTML): 요소 안쪽 맨 뒤에 HTML을 끼워 넣는다
  item.querySelector('.dish__top').insertAdjacentHTML('beforeend', scoreHtml(menu));
  // 낭독기에게 결과를 알려 준다 (화면에는 안 보이는 sr-only 글자)
  if (editing) {
    item.querySelector('.dish__status').textContent = `${rating}점으로 바꿨어요`;
  } else {
    item.querySelector('.dish__status').textContent = `${rating}점 남겼어요`;
  }
  // 별 버튼을 새로 그려서 키보드 포커스가 사라졌으니, 방금 누른 별에 다시 포커스를 둔다
  // (키보드 사용자가 "어디 있었더라?" 하고 헤매지 않게)
  item.querySelector(`.quick-rate__star[data-rating="${rating}"]`).focus();

  // ── 7) TOP 3 다시 그리기 ──
  renderTop();
}

// ----------------------------------------------------------------------------
// toggleAllergy(toggle) — [알레르기 확인] 버튼을 누를 때마다 열고 닫는다
//
//   닫혀 있으면 → 열기: 알레르기 글자 보이기 + 버튼 글자 "알레르기 닫기"
//   열려 있으면 → 닫기: 알레르기 글자 숨기기 + 버튼 글자 "알레르기 확인"
//   aria-expanded 값도 같이 바꿔서 낭독기가 "펼쳐짐/접힘"을 알 수 있게 한다
// ----------------------------------------------------------------------------
function toggleAllergy(toggle) {
  // 지금 열려 있지 않으면 → 이번엔 "열 차례"(open = true)
  // [문법] getAttribute(이름): 속성 값을 글자로 꺼낸다 ('true' 또는 'false')
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    toggle.textContent = '알레르기 닫기';
  } else {
    toggle.textContent = '알레르기 확인';
  }
  // 버튼의 aria-controls에 적힌 id로 알레르기 글자를 찾아 보이거나 숨긴다
  // [문법] 요소.hidden = true(숨기기) / false(보이기).  !open: 열 차례면 hidden = false
  document.getElementById(toggle.getAttribute('aria-controls')).hidden = !open;
}

// ----------------------------------------------------------------------------
// setupPanel() — 메뉴 목록 안의 클릭(별 버튼, 알레르기 버튼)을 연결한다 (페이지 열 때 한 번)
//
//   💡 왜 버튼마다 연결하지 않고 바깥 상자(panel)에 연결할까?
//     메뉴 목록은 탭을 바꿀 때마다 innerHTML로 통째로 새로 그려진다.
//     버튼에 직접 연결하면, 새로 그릴 때마다 버튼이 새것으로 바뀌어서 연결이 끊긴다.
//     바깥 상자는 그대로 남아 있으니, 거기에 한 번만 연결하면 계속 동작한다 (이벤트 위임)
// ----------------------------------------------------------------------------
function setupPanel() {
  panel.addEventListener('click', function (event) {
    // 별 버튼을 눌렀나?
    const star = event.target.closest('.quick-rate__star');
    if (star) {
      // 별이 속한 메뉴 한 줄(.dish)과 별 번호를 넘긴다
      // [문법] async 함수를 await 없이 부르면 기다리지 않고 바로 다음 줄로 간다(여기선 return)
      quickRate(star.closest('.dish'), Number(star.dataset.rating));
      return;
    }

    // 알레르기 버튼을 눌렀나?
    const toggle = event.target.closest('.dish__allergy-toggle');
    if (toggle) {
      toggleAllergy(toggle);
    }
    // 둘 다 아니면 아무것도 안 한다 (메뉴 이름 링크 등은 브라우저가 알아서 이동)
  });
}

// ============================================================================
// 📡 서버에서 불러오기
// ============================================================================

// ----------------------------------------------------------------------------
// loadMeal(code) — 끼니 하나를 서버에서 불러와 meals에 넣는다
//
//   성공 → meals[code] = { menus: [...] }
//   실패 → meals[code] = { error: '메시지' }
//   ⭐ 실패해도 오류를 "던지지 않는다". 그래서 세 끼를 동시에 불러올 때 하나가 실패해도 나머지가 멀쩡하다.
// ----------------------------------------------------------------------------
async function loadMeal(code) {
  try {
    const data = await getTodayMenus(code);
    meals[code] = { menus: data.menus };
    // 오늘 날짜는 처음 성공한 응답에서 한 번만 정한다 (세 끼 모두 같은 날짜라서 아무거나 괜찮다)
    if (!date) date = data.date;
  } catch (err) {
    meals[code] = { error: err.message };
  }
}

// ----------------------------------------------------------------------------
// loadInfo() — 나이스에서 칼로리·영양소·알레르기를 받아 오고 화면을 다시 그린다
//
//   나이스 정보는 "있으면 좋은" 덤이라서, 실패해도 메뉴와 평가는 그대로 보여 준다.
//   (실패하면 infoFailed = true → 요약 줄에 "불러오지 못했어요" 안내만 뜬다)
// ----------------------------------------------------------------------------
async function loadInfo() {
  try {
    info = await getMealInfo(date);
    infoFailed = false;
  } catch (err) {
    info = null;
    infoFailed = true;
  }
  // 칼로리(탭 글자)와 알레르기(메뉴 목록)가 생겼으니 다시 그린다
  renderTabs();
  renderPanel();
}

// ----------------------------------------------------------------------------
// reloadMeal(code) — 실패한 끼니 하나만 다시 불러온다 ([다시 시도] 버튼)
// ----------------------------------------------------------------------------
async function reloadMeal(code) {
  // 다시 "불러오는 중" 상태로 되돌리고 화면에 보여 준다
  meals[code] = undefined;
  renderTabs();
  renderPanel();

  // 불러오기 전에 날짜를 알고 있었는지 기억해 둔다
  // (처음에 세 끼가 전부 실패했다면 아직 날짜를 모른다)
  const hadDate = date !== null;
  await loadMeal(code);
  // 이번에 처음으로 날짜를 알게 됐다면 → 날짜 글자를 보여 주고, 나이스 정보도 이제 부를 수 있다
  if (!hadDate && date) {
    dateText.textContent = formatDate(date);
    loadInfo(); // await 없이 부른다 → 기다리지 않고 진행. 나이스 답장이 오면 loadInfo가 알아서 다시 그린다
  }
  // 결과(성공 또는 또 실패)를 화면에 반영
  renderTabs();
  renderPanel();
  renderTop();
}

// ----------------------------------------------------------------------------
// start() — 페이지를 열면 한 번 실행되는 시작 함수
// ----------------------------------------------------------------------------
async function start() {
  // 1) 지금 시각에 맞는 탭을 고르고, 일단 "불러오는 중" 화면부터 보여 준다
  selected = mealByTime();
  renderTabs();
  renderPanel();
  renderLoading(topList, '순위를 모으는 중이에요…');

  // 2) 세 끼를 "동시에" 불러오고, 셋 다 끝날 때까지 기다린다
  //    하나씩 차례로 부르면 3배 오래 걸리니까 동시에 보낸다.
  //    loadMeal은 실패해도 오류를 던지지 않아서, 하나가 실패해도 나머지는 정상으로 보여 줄 수 있다
  // [문법] Promise.all([작업1, 작업2, 작업3]): 여러 비동기 작업을 동시에 시작하고, 모두 끝날 때까지 기다린다
  await Promise.all([loadMeal(1), loadMeal(2), loadMeal(3)]);

  // 날짜를 알게 됐으면 "10월 27일 화요일"처럼 보여 준다
  if (date) dateText.textContent = formatDate(date);

  // 3) 지금 시각의 끼니에 메뉴가 없으면(예: 석식이 없는 날 저녁) 메뉴가 있는 다른 끼니를 먼저 보여 준다
  if (!hasMenus(selected)) {
    for (const code of MEAL_CODES) {
      if (hasMenus(code)) {
        selected = code;
        break; // [문법] break: 찾았으니 반복문을 바로 끝낸다
      }
    }
  }
  renderTabs();
  renderPanel();
  renderTop();

  // 4) 날짜를 알 때만 나이스 정보를 부른다 (나이스는 날짜로 물어봐야 해서)
  if (date) loadInfo();
}

// ============================================================================
// ▶ 시작!
// ============================================================================
// 클릭·키보드 연결을 먼저 해 두고, 데이터를 불러오기 시작한다
// (type="module" 스크립트는 HTML을 다 읽은 뒤에 실행되므로, 위에서 찾은 요소들이 이미 있다)
setupTabs();
setupPanel();
start();
