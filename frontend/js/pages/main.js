// 역할: 메인 페이지 동작 — 오늘의 메뉴 (명세서 3장 기능 1). 담당: 김태건 (아래쪽 "오늘 인기 TOP 3"은 todayTop.js에 따로 있다)
// 순서: 서버에서 조식·중식·석식 메뉴를 한 번에 불러온다 → 고른 식사를 그린다 → 나이스에서 칼로리·알레르기를 받아 덧붙인다.
// 별을 누르면 바로 평가가 등록된다 (별점만 있는 평가). 태그·의견은 메뉴 이름을 눌러 상세 페이지에서 남긴다.
// [문법] import { 이름들 } from '경로': 다른 모듈이 export한 함수·값을 가져온다. '../'는 한 단계 위 폴더, './'는 같은 폴더
import { createReview, getMealInfo, getTodayMenus, updateReviewRating } from '../api/index.js';
import { findDish } from '../api/neis.js';
import { MEAL_TYPES, RATING_LABELS } from '../api/reviewFields.js';
import { escapeHtml, formatDate } from '../common/format.js';
import { renderEmpty, renderError, renderLoading } from '../common/state.js';
import { dishIcon } from '../common/ui.js';
import { renderTodayTop } from './todayTop.js';

const MEAL_CODES = [1, 2, 3]; // 1 조식 / 2 중식 / 3 석식
const RATED_KEY = 'mealmeter-quick-ratings'; // 바로 남긴 별점을 기억하는 브라우저 저장소 이름
const MOCK_REVIEWS_KEY = 'mealmeter-mock-reviews-v2'; // 예전 가짜 서버가 쓰던 저장소 이름

// HTML에서 내용을 채울 자리를 찾아 둔다
// [문법] document.getElementById('id'): HTML에서 그 id를 가진 요소 하나를 찾는다
const dateText = document.getElementById('today-date');
const tabList = document.getElementById('meal-tabs');
// [문법] querySelectorAll('선택자'): 선택자에 맞는 요소를 '전부' 찾는다. Array.from으로 진짜 배열로 바꾼다
const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
const panel = document.getElementById('meal-panel');
const topList = document.getElementById('today-top-list');

// ---------- 페이지가 기억하는 값 ----------
// meals[식사코드] = { menus: [...] } (성공) 또는 { error: '메시지' } (실패). 아직 불러오는 중이면 undefined
// [문법] let: 나중에 값을 바꾸는 변수. 페이지 전체가 같이 쓰는 '상태' 값들
let meals = {};
let date = null; // 서버가 정한 오늘 날짜 "2026-10-27"
let info = null; // 나이스 정보 { 1: MealInfo, 2: …, 3: … }. 아직 없거나 실패하면 null
let infoFailed = false; // 나이스 정보를 불러오다 실패했는지 (실패하면 "못 불러왔어요" 안내를 보여 준다)
let selected = null; // 지금 고른 식사 코드

// ================= 바로 남긴 별점 기억하기 =================

// 예전 가짜 서버(모의 평가)가 만든 수정 토큰 목록. 이 토큰은 진짜 서버에서 못 쓰니 골라내야 한다
function loadMockTokens() {
  const tokens = [];
  try {
    // [문법] localStorage.getItem(키): 브라우저 저장소에서 글자를 꺼낸다(없으면 null)
    // [문법] JSON.parse(글자): JSON 글자 → 객체
    const mockReviews = JSON.parse(localStorage.getItem(MOCK_REVIEWS_KEY));
    if (Array.isArray(mockReviews)) {
      for (const review of mockReviews) {
        if (review && review.editToken) tokens.push(review.editToken);
      }
    }
  } catch (err) {
    // 예전 모의 데이터가 손상되어도 실제 별점 기록은 계속 읽는다.
  }
  return tokens;
}

// 이 브라우저에서 바로 별점을 남긴 메뉴 { menuId: { rating, reviewId, editToken } }.
// 같은 메뉴를 다시 누르면 새 평가를 만들지 않고 이 평가의 별점을 고친다
function loadRated() {
  try {
    let saved = JSON.parse(localStorage.getItem(RATED_KEY));
    // 저장된 게 없거나(null) 객체가 아니면 빈 객체로 시작한다
    if (!saved || typeof saved !== 'object') saved = {};

    const mockTokens = loadMockTokens();
    // [문법] for (const 키 in 객체): 객체의 키를 하나씩 꺼내 반복한다
    for (const menuId in saved) {
      const value = saved[menuId];
      if (typeof value === 'number') {
        // 예전 형식 { menuId: 별점 숫자 }은 수정용 값이 없어서 별점만 기억한다
        saved[menuId] = { rating: value };
      } else if (value && mockTokens.includes(value.editToken)) {
        // 모의 평가의 토큰은 버리고, 실제 평가의 수정 토큰만 남긴다
        delete saved[menuId];
      }
    }
    return saved;
  } catch (err) {
    return {}; // 저장소를 못 쓰는 환경(비공개 창 등)이면 기억 없이 동작한다
  }
}
const rated = loadRated();

function saveRated() {
  try {
    // [문법] localStorage.setItem(키, 글자): 저장. JSON.stringify(객체)로 객체를 글자로 바꿔야 한다
    localStorage.setItem(RATED_KEY, JSON.stringify(rated));
  } catch (err) {
    // 저장에 실패해도 지금 화면에서는 계속 동작한다
  }
}

// 이 메뉴에 내가 남긴 별점 (안 남겼으면 0)
function myRatingOf(menuId) {
  const mine = rated[menuId];
  if (mine && mine.rating) return mine.rating;
  return 0;
}

// 지금 시각에 맞는 식사 (9시 전 조식, 14시 전 중식, 그 뒤 석식)
function mealByTime() {
  // [문법] new Date().getHours(): 지금 시각의 '시'(0~23)
  const hour = new Date().getHours();
  if (hour < 9) return 1;
  if (hour < 14) return 2;
  return 3;
}

// ================= 식사 탭 =================

// 그 식사에 메뉴가 하나라도 있는지 (불러오는 중·실패·급식 없음이면 false)
function hasMenus(code) {
  const meal = meals[code];
  return Boolean(meal && meal.menus && meal.menus.length > 0);
}

// 급식이 없다고 확실히 아는 탭만 막는다 (불러오기에 실패한 탭은 눌러서 다시 시도할 수 있게 둔다)
function isEmptyMeal(code) {
  const meal = meals[code];
  return Boolean(meal && meal.menus && meal.menus.length === 0);
}

// 그 식사의 나이스 정보 (칼로리·영양소·메뉴별 알레르기). 없으면 null
function infoOf(code) {
  if (info && info[code]) return info[code];
  return null;
}

// 탭 이름 아래 작은 글자: 불러오는 중이면 "…", 칼로리를 알면 "812 kcal", 모르면 "6가지"
function tabSubText(code) {
  const meal = meals[code];
  if (!meal) return '…';
  if (meal.error) return '불러오기 실패';
  if (isEmptyMeal(code)) return '없음';
  const mealInfo = infoOf(code);
  if (mealInfo && mealInfo.kcal) {
    // [문법] Math.round: 반올림
    return `${Math.round(mealInfo.kcal)} kcal`;
  }
  return `${meal.menus.length}가지`;
}

// 탭 세 개의 선택 표시·막힘·작은 글자를 지금 값(selected, meals, info)에 맞게 다시 그린다
function renderTabs() {
  for (const tab of tabs) {
    // [문법] 요소.dataset.meal: HTML의 data-meal="2" 속성 값(글자)을 꺼낸다. Number로 숫자로
    const code = Number(tab.dataset.meal);
    const on = code === selected;
    // [문법] 요소.setAttribute(이름, 값): HTML 속성을 정한다. 속성 값은 글자라 String(true) → 'true'
    tab.setAttribute('aria-selected', String(on));
    // 고른 탭만 Tab 키로 들어올 수 있고, 나머지는 화살표 키로 옮겨 다닌다
    // [문법] tabIndex: 0 = Tab 키 순서에 들어감, -1 = 안 들어감(코드로 focus()만 가능)
    if (on) {
      tab.tabIndex = 0;
    } else {
      tab.tabIndex = -1;
    }
    // [문법] disabled = true면 버튼을 누를 수 없다
    tab.disabled = isEmptyMeal(code) && !on;
    // [문법] 요소.textContent = 글자: HTML이 아닌 순수 글자로 넣는다(<, > 도 글자 그대로 → 안전)
    tab.querySelector('.meal-tabs__sub').textContent = tabSubText(code);
  }
  // [문법] aria-labelledby: 이 영역의 이름을 그 id 요소(고른 탭)의 글자로 정한다
  panel.setAttribute('aria-labelledby', `meal-tab-${selected}`);
}

// 식사를 바꾼다. 키보드로 옮긴 경우(moveFocus가 true)에는 포커스도 새 탭으로 옮긴다
function selectMeal(code, moveFocus) {
  selected = code;
  renderTabs();
  renderPanel();
  if (moveFocus) {
    // [문법] 요소.focus(): 그 요소로 키보드 포커스를 옮긴다
    document.getElementById(`meal-tab-${code}`).focus();
  }
}

// 탭 클릭·키보드 동작을 연결한다 (탭마다 따로 연결하지 않고 탭 묶음 하나에서 받는다)
function setupTabs() {
  // [문법] addEventListener('click', 함수): 클릭할 때마다 함수를 실행. event에 클릭 정보가 들어온다
  tabList.addEventListener('click', function (event) {
    // [문법] event.target: 실제로 누른 요소. .closest(선택자): 자신부터 위로 올라가며 선택자에 맞는 첫 조상을 찾는다(없으면 null)
    const tab = event.target.closest('[role="tab"]');
    if (tab && !tab.disabled) {
      selectMeal(Number(tab.dataset.meal), false);
    }
  });

  // ← → Home End 키로 탭을 옮긴다 (막힌 탭은 건너뛴다)
  // [문법] 'keydown': 키보드 키를 누를 때 일어나는 이벤트
  tabList.addEventListener('keydown', function (event) {
    // 누를 수 있는 탭만 모은다
    const usable = [];
    for (const tab of tabs) {
      if (!tab.disabled) usable.push(tab);
    }
    // [문법] document.activeElement: 지금 포커스된 요소. 배열.indexOf(값): 위치 번호(없으면 -1)
    const index = usable.indexOf(document.activeElement);
    if (index === -1) return;

    // 누른 키에 따라 옮겨 갈 위치를 정한다. 끝에서 더 가면 반대쪽 끝으로 돌아간다
    let next;
    if (event.key === 'ArrowRight') {
      next = index + 1;
      if (next === usable.length) next = 0;
    } else if (event.key === 'ArrowLeft') {
      next = index - 1;
      if (next === -1) next = usable.length - 1;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = usable.length - 1;
    } else {
      return; // 다른 키는 그냥 둔다
    }
    // [문법] event.preventDefault(): 브라우저 기본 동작(화살표로 화면 스크롤 등)을 막는다
    event.preventDefault();
    selectMeal(Number(usable[next].dataset.meal), true);
  });
}

// ================= 메뉴 목록 =================

// 메뉴 이름 옆 "★ 4.5 · 2명". 평가가 없으면 아무것도 안 그린다
function scoreHtml(menu) {
  if (menu.reviewCount === 0) return '';
  return `
    <p class="dish__score">
      <span class="sr-only">평균 별점 </span><span class="dish__score-star" aria-hidden="true">★</span>
      <strong>${menu.averageRating.toFixed(1)}</strong> · ${menu.reviewCount}명
    </p>`;
}

// 별 다섯 개 버튼. 누르면 바로 등록되고, 이미 남긴 메뉴는 다시 눌러 별점을 고칠 수 있다
// (화살표 키로 실수로 등록되지 않게 라디오 대신 버튼을 쓴다)
function quickRateHtml(menu) {
  const myRating = myRatingOf(menu.menuId);

  let stars = '';
  for (let n = 1; n <= 5; n += 1) {
    // 내 별점 이하인 별은 꽉 찬 별(★)로 보여 준다
    let filledClass = '';
    let symbol = '☆';
    if (n <= myRating) {
      filledClass = ' is-filled';
      symbol = '★';
    }
    // [문법] aria-pressed="true/false": 눌린 상태의 토글 버튼이라고 낭독기에 알려 준다
    // [문법] data-rating="${n}": 몇 번째 별인지 HTML에 적어 둔다(클릭할 때 dataset.rating으로 읽음)
    stars += `
    <button type="button" class="quick-rate__star${filledClass}" data-rating="${n}"
      aria-pressed="${n === myRating}" aria-label="${n}점, ${RATING_LABELS[n]}">${symbol}</button>`;
  }

  // 이미 남겼는지에 따라 묶음 이름(aria-label)을 다르게 만든다
  let label = `${escapeHtml(menu.name)} 별점 바로 남기기`;
  if (myRating) {
    label = `${escapeHtml(menu.name)} 내 별점 ${myRating}점, 눌러서 바꾸기`;
  }
  // [문법] role="group": 버튼 5개가 한 묶음이라고 낭독기에 알려 준다
  return `<div class="quick-rate" role="group" aria-label="${label}">${stars}</div>`;
}

// 메뉴 상세(평가 작성) 페이지 주소. 예: /menu.html?menuId=8&meal=2
// [문법] encodeURIComponent(값): 주소에 넣어도 안전한 글자로 바꾼다
function detailHref(menu) {
  return `/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${selected}`;
}

// 메뉴 한 줄 (그림 글자, 이름, 평균 별점, 바로 별점 버튼, 알레르기 버튼)
// 알레르기는 나이스 정보에서 이름으로 찾는다. 못 찾으면 버튼을 아예 안 만든다
function dishHtml(menu) {
  let allergies = [];
  const dish = findDish(infoOf(selected), menu.name);
  if (dish) allergies = dish.allergies;

  let allergyButton = '';
  let allergyText = '';
  if (allergies.length > 0) {
    // 버튼과 내용 상자를 이어 줄 id 글자(aria-controls에 쓴다)
    const allergyId = `allergy-${menu.menuId}`;
    // [문법] aria-expanded: 펼쳐졌는지(true/false), aria-controls: 이 버튼이 여닫는 요소의 id
    allergyButton = `<button type="button" class="dish__allergy-toggle" aria-expanded="false" aria-controls="${allergyId}">알레르기 확인</button>`;
    // [문법] hidden 속성: 처음에는 숨겨 둔다. allergies.join(', '): 배열을 쉼표로 이어 한 줄 글자로
    allergyText = `<p class="dish__allergy" id="${allergyId}" hidden><strong>알레르기</strong> ${escapeHtml(allergies.join(', '))}</p>`;
  }

  // [문법] data-menu-id: 클릭할 때 어느 메뉴인지 알려고 적어 둔다(dataset.menuId로 읽음)
  // [문법] role="status": 바뀐 글자를 낭독기가 조용히 읽어 줌(sr-only라 화면에는 안 보임), role="alert": 오류를 바로 읽어 줌
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

// 영양소 값 글자. 없으면 '-'
function gramsText(value) {
  if (value === null || value === undefined) return '-';
  return `${value}g`;
}

// 영양소 한 칸. [문법] <dt>/<dd>: 설명 목록의 용어 - 설명 짝. 여기서는 영양소 이름 - 값
function nutrientHtml(name, value) {
  return `<div class="meal-card__nutrient"><dt>${name}</dt><dd>${gramsText(value)}</dd></div>`;
}

// 칼로리·영양소 줄. 나이스 정보가 없으면 끼니 이름과 가짓수만 보여 준다
function summaryHtml(menus) {
  const meal = infoOf(selected);
  const label = `<p class="meal-card__label">${MEAL_TYPES[selected]} · ${menus.length}가지</p>`;
  if (!meal) {
    let note = '';
    if (infoFailed) {
      note = '<p class="meal-card__note">칼로리·알레르기 정보를 불러오지 못했어요.</p>';
    }
    return `<div class="meal-card__summary"><div>${label}${note}</div></div>`;
  }

  const nutrients = nutrientHtml('탄수화물', meal.carb) + nutrientHtml('단백질', meal.protein) + nutrientHtml('지방', meal.fat);
  // [문법] toFixed(1): 소수 첫째 자리 글자로
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

// 고른 식사의 내용 자리를 그린다: 불러오는 중 → 오류 → 급식 없음 → 메뉴 목록 순서로 확인
// 위에서부터 차례로 확인하고, 맞으면 그리고 return으로 끝낸다
function renderPanel() {
  const meal = meals[selected];
  if (!meal) {
    renderLoading(panel, '급식표를 불러오는 중이에요…');
    return;
  }
  if (meal.error) {
    // '다시 시도'를 누를 때 부를 함수를 넘긴다(지금 바로 실행하지 않음)
    renderError(panel, meal.error, function () {
      reloadMeal(selected);
    });
    return;
  }
  if (meal.menus.length === 0) {
    renderEmpty(panel, '오늘은 급식이 없어요', '<p class="small">주말이나 휴일에는 급식표가 올라오지 않아요. 인기 순위에서 지난 메뉴 평가를 볼 수 있어요.</p>');
    return;
  }

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

// ================= 오늘 인기 TOP 3 =================
// 그리는 코드는 todayTop.js. 여기서는 지금 가진 메뉴 정보(meals)를 넘겨주기만 한다.

function renderTop() {
  renderTodayTop(topList, meals);
}

// ================= 별점 바로 남기기 · 알레르기 =================

// 지금 고른 식사에서 번호로 메뉴를 찾는다
function findMenu(menuId) {
  for (const menu of meals[selected].menus) {
    if (menu.menuId === menuId) return menu;
  }
  return null;
}

// 메뉴 줄 안의 별 버튼들을 누를 수 있게/없게 한다
function setStarsDisabled(item, disabled) {
  const buttons = item.querySelectorAll('.quick-rate__star');
  for (const button of buttons) {
    button.disabled = disabled;
  }
}

// 소수 첫째 자리까지 반올림 (예: 4.25 → 4.3)
function roundOne(value) {
  return Math.round(value * 10) / 10;
}

// 별을 눌렀을 때: 처음이면 별점만 있는 평가를 새로 보내고, 이미 남겼으면 그 평가의 별점을 고친다.
// 성공하면 그 메뉴 줄만 새로 그린다. item: 누른 별이 들어 있는 <li class="dish">, rating: 누른 별 번호(1~5)
// [문법] async function: 안에서 await로 서버 응답을 기다리는 비동기 함수
async function quickRate(item, rating) {
  // item.dataset.menuId는 글자라 Number로 바꿔서 찾는다
  const menu = findMenu(Number(item.dataset.menuId));
  const mine = rated[menu.menuId]; // 이미 남긴 별점 { rating, reviewId, editToken } 또는 undefined
  if (mine && mine.rating === rating) return; // 같은 별을 다시 누르면 아무것도 안 한다

  const errorBox = item.querySelector('.dish__error');
  setStarsDisabled(item, true); // 두 번 누르기 방지
  errorBox.textContent = '';

  // 고칠 수 있는 평가(번호와 수정 토큰이 다 있음)가 있으면 수정, 아니면 새로 등록
  let editing = false;
  if (mine && mine.reviewId && mine.editToken) {
    editing = true;
  }

  let saved; // 새로 등록했을 때 서버가 돌려준 평가
  try {
    if (editing) {
      // [문법] await: 서버 응답이 올 때까지 기다린다. 실패하면 오류가 던져져 아래 catch로 간다
      await updateReviewRating(mine.reviewId, rating, mine.editToken);
    } else {
      // 별점만 있는 평가. 태그는 null(안 고름), 의견은 빈 글자
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
    // 서버가 보낸 메시지를 그대로 보여 준다
    errorBox.textContent = err.message;
    setStarsDisabled(item, false);
    return;
  }

  // 서버에 다시 묻지 않고 평균·평가 수를 고친다 (수정이면 평가 수는 그대로, 예전 별점만 새 별점으로 바꿔 계산)
  // 평균 × 개수 = 합계. 여기서 하나를 바꾸거나 더해 새 평균을 계산한다
  const total = menu.averageRating * menu.reviewCount;
  if (editing) {
    menu.averageRating = roundOne((total - mine.rating + rating) / menu.reviewCount);
    mine.rating = rating;
  } else {
    menu.averageRating = roundOne((total + rating) / (menu.reviewCount + 1));
    menu.reviewCount += 1;
    rated[menu.menuId] = { rating: rating, reviewId: saved.reviewId, editToken: saved.editToken };
  }
  saveRated();

  // 목록 전체를 다시 그리지 않고 이 메뉴만 바꾼다
  item.querySelector('.dish__rate').innerHTML = quickRateHtml(menu);
  const oldScore = item.querySelector('.dish__score');
  if (oldScore) oldScore.remove();
  // [문법] insertAdjacentHTML('beforeend', HTML): 요소 안 맨 뒤에 HTML을 끼워 넣는다
  item.querySelector('.dish__top').insertAdjacentHTML('beforeend', scoreHtml(menu));
  // 화면에는 안 보이고(sr-only) 화면 낭독기만 읽는 결과 문구
  if (editing) {
    item.querySelector('.dish__status').textContent = `${rating}점으로 바꿨어요`;
  } else {
    item.querySelector('.dish__status').textContent = `${rating}점 남겼어요`;
  }
  // 별 버튼을 새로 그렸으니 방금 누른 별에 다시 포커스를 둔다
  item.querySelector(`.quick-rate__star[data-rating="${rating}"]`).focus();
  renderTop();
}

// 알레르기 버튼: 누를 때마다 열고 닫는다 (aria-expanded로 낭독기에도 열림/닫힘을 알린다)
function toggleAllergy(toggle) {
  // [문법] getAttribute(이름): 속성 값(글자). 지금 열려 있지 않으면 → 열 차례(true)
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    toggle.textContent = '알레르기 닫기';
  } else {
    toggle.textContent = '알레르기 확인';
  }
  // [문법] 요소.hidden = true/false: 숨기기/보이기
  document.getElementById(toggle.getAttribute('aria-controls')).hidden = !open;
}

// 메뉴 목록 안의 클릭(별 버튼, 알레르기 열기/닫기)을 한 곳에서 받는다.
// 목록은 innerHTML로 계속 새로 그려지므로, 버튼마다가 아니라 바깥 상자(panel)에 연결해야 한다
function setupPanel() {
  panel.addEventListener('click', function (event) {
    const star = event.target.closest('.quick-rate__star');
    if (star) {
      // [문법] async 함수를 await 없이 부르면 기다리지 않고 바로 다음 줄로 간다
      quickRate(star.closest('.dish'), Number(star.dataset.rating));
      return;
    }

    const toggle = event.target.closest('.dish__allergy-toggle');
    if (toggle) {
      toggleAllergy(toggle);
    }
  });
}

// ================= 불러오기 =================

// 식사 하나를 서버에서 불러와 meals에 넣는다. 실패해도 오류를 던지지 않고 { error } 로 담는다
async function loadMeal(code) {
  try {
    const data = await getTodayMenus(code);
    meals[code] = { menus: data.menus };
    // 날짜는 처음 성공한 응답에서 한 번만 정한다 (세 끼 모두 같은 날짜)
    if (!date) date = data.date;
  } catch (err) {
    meals[code] = { error: err.message };
  }
}

// 나이스 정보는 덧붙이는 정보라서, 실패해도 메뉴와 평가는 그대로 보여 준다
async function loadInfo() {
  try {
    info = await getMealInfo(date);
    infoFailed = false;
  } catch (err) {
    info = null;
    infoFailed = true;
  }
  renderTabs();
  renderPanel();
}

// 실패한 식사 하나만 다시 불러온다 ("다시 시도" 버튼)
async function reloadMeal(code) {
  // undefined를 넣어 '불러오는 중' 상태로 되돌린다
  meals[code] = undefined;
  renderTabs();
  renderPanel();

  const hadDate = date !== null;
  await loadMeal(code);
  // 이번에 처음으로 날짜를 알게 됐으면 날짜를 보여 주고 나이스 정보도 부른다
  if (!hadDate && date) {
    dateText.textContent = formatDate(date);
    loadInfo(); // await 없이 불러서 기다리지 않고 진행한다(끝나면 알아서 다시 그림)
  }
  renderTabs();
  renderPanel();
  renderTop();
}

// 페이지를 열면 한 번 실행된다
async function start() {
  selected = mealByTime();
  renderTabs();
  renderPanel();
  renderLoading(topList, '순위를 모으는 중이에요…');

  // 세 끼를 동시에 부르고 셋 다 끝날 때까지 기다린다. loadMeal은 실패해도 오류를 던지지 않아서 하나가 실패해도 나머지는 보여 준다
  // [문법] Promise.all([...]): 여러 비동기 작업을 동시에 시작하고, 모두 끝날 때까지 기다린다
  await Promise.all([loadMeal(1), loadMeal(2), loadMeal(3)]);

  if (date) dateText.textContent = formatDate(date);

  // 지금 시각의 식사가 없으면 급식이 있는 다른 식사를 먼저 보여 준다
  if (!hasMenus(selected)) {
    for (const code of MEAL_CODES) {
      if (hasMenus(code)) {
        selected = code;
        break; // [문법] break: 반복문을 바로 끝낸다
      }
    }
  }
  renderTabs();
  renderPanel();
  renderTop();

  // 날짜를 알 때만 나이스 정보를 부른다
  if (date) loadInfo();
}

// 파일 맨 아래에서 함수들을 차례로 불러 페이지를 시작한다(모듈은 HTML을 다 읽은 뒤 실행되므로 요소가 이미 있다)
setupTabs();
setupPanel();
start();
