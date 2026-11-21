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

// [문법] const: 다시 대입하지 않는 변수. 줄 끝 // 뒤는 설명 주석
const MEAL_CODES = [1, 2, 3]; // 1 조식 / 2 중식 / 3 석식
const RATED_KEY = 'mealmeter-quick-ratings'; // 바로 남긴 별점을 기억하는 브라우저 저장소 이름

// HTML에서 내용을 채울 자리를 찾아 둔다
// [문법] document.getElementById('id'): HTML에서 그 id를 가진 요소 하나를 찾는다
const dateText = document.getElementById('today-date');
const tabList = document.getElementById('meal-tabs');
// [문법] 요소.querySelectorAll('선택자'): 안에서 CSS 선택자에 맞는 요소를 '전부' 찾는다(NodeList). [role="tab"]은 속성 선택자
// [문법] [...NodeList]: 전개 문법으로 진짜 배열로 바꾼다. 그래야 filter, indexOf 같은 배열 메서드를 다 쓸 수 있다
const tabs = [...tabList.querySelectorAll('[role="tab"]')];
const panel = document.getElementById('meal-panel');
const topList = document.getElementById('today-top-list');

// ---------- 페이지가 기억하는 값 ----------
// meals[식사코드] = { menus: [...] } (성공) 또는 { error: '메시지' } (실패)
// [문법] let: 나중에 값을 바꾸는 변수. 페이지 전체가 같이 쓰는 '상태' 값들
let meals = {};
let date = null; // 서버가 정한 오늘 날짜 "2026-10-27"
let info = null; // 나이스 정보 { 1: MealInfo, 2: …, 3: … }. 아직 없거나 실패하면 null
let infoFailed = false; // 나이스 정보를 불러오다 실패했는지 (실패하면 "못 불러왔어요" 안내를 보여 준다)
let selected = null; // 지금 고른 식사 코드

// 이 브라우저에서 바로 별점을 남긴 메뉴 { menuId: { rating, reviewId, editToken } }.
// 같은 메뉴를 다시 누르면 새 평가를 만들지 않고 이 평가의 별점을 고친다
// [문법] function: 함수 선언. 저장된 별점을 불러온다
function loadRated() {
  try {
    // [문법] localStorage.getItem(키): 브라우저 저장소에서 글자를 꺼낸다(없으면 null)
    // [문법] JSON.parse(글자): JSON 글자 → 객체. JSON.parse(null)은 null이라 || {} 로 빈 객체를 쓴다
    const saved = JSON.parse(localStorage.getItem(RATED_KEY)) || {};
    // 모의 평가의 토큰만 골라내고 실제 평가의 수정 토큰은 유지한다.
    let mockTokens = new Set();
    try {
      const mockReviews = JSON.parse(localStorage.getItem('mealmeter-mock-reviews-v2'));
      if (Array.isArray(mockReviews)) {
        mockTokens = new Set(mockReviews.map((review) => review?.editToken).filter(Boolean));
      }
    } catch {
      // 이전 모의 데이터가 손상되어도 실제 별점 기록은 계속 읽는다.
    }
    // 예전 형식 { menuId: 별점 숫자 }은 수정용 값이 없어서 별점만 기억한다
    // [문법] Object.entries(객체): [[키, 값], ...] 배열. for...of로 하나씩 돌며 [menuId, value]로 구조 분해한다
    for (const [menuId, value] of Object.entries(saved)) {
      // [문법] typeof 값: 자료형 이름 글자('number', 'string', 'object' 등)를 돌려준다
      if (mockTokens.has(value?.editToken)) delete saved[menuId];
      else if (typeof value === 'number') saved[menuId] = { rating: value };
    }
    return saved;
  // [문법] try { } catch { }: try 안에서 오류가 나면 catch 안을 실행한다(오류 정보가 필요 없으면 (err) 생략)
  } catch {
    return {}; // 저장소를 못 쓰는 환경(비공개 창 등)이면 기억 없이 동작한다
  }
}
// [문법] 파일이 실행될 때 한 번 불러서 결과 객체를 rated에 담는다
const rated = loadRated();

function saveRated() {
  try {
    // [문법] localStorage.setItem(키, 글자): 저장. JSON.stringify(객체)로 객체를 글자로 바꿔야 한다
    localStorage.setItem(RATED_KEY, JSON.stringify(rated));
  } catch {
    // 저장에 실패해도 지금 화면에서는 계속 동작한다
  }
}

// 지금 시각에 맞는 식사 (9시 전 조식, 14시 전 중식, 그 뒤 석식)
function mealByTime() {
  // [문법] new Date().getHours(): 지금 시각의 '시'(0~23)
  const hour = new Date().getHours();
  // [문법] if (조건) return 값;: 조건이 맞으면 값을 돌려주고 바로 끝낸다. 위에서부터 차례로 검사
  if (hour < 9) return 1;
  if (hour < 14) return 2;
  return 3;
}

// ================= 식사 탭 =================

// 그 식사에 메뉴가 하나라도 있는지 (불러오는 중·실패·급식 없음이면 false)
function hasMenus(code) {
  // [문법] meals[code]?.menus?.length: 중간 값이 없어도 오류 없이 undefined가 되는 옵셔널 체이닝(?.)
  // [문법] ?? 0: undefined/null이면 0. > 0 비교 결과(true/false)를 그대로 돌려준다
  return (meals[code]?.menus?.length ?? 0) > 0;
}

// 급식이 없다고 확실히 아는 탭만 막는다 (불러오기에 실패한 탭은 눌러서 다시 시도할 수 있게 둔다)
function isEmptyMeal(code) {
  // [문법] === : 값과 자료형이 모두 같아야 true. undefined === 0 은 false(아직 모름)
  return meals[code]?.menus?.length === 0;
}

// 탭 이름 아래 작은 글자: 불러오는 중이면 "…", 칼로리를 알면 "812 kcal", 모르면 "6가지"
function tabSubText(code) {
  // [문법] !값: 값이 없으면(undefined 등) true
  if (!meals[code]) return '…';
  if (meals[code].error) return '불러오기 실패';
  if (isEmptyMeal(code)) return '없음';
  // [문법] ?.[code]: 대괄호로 꺼낼 때의 옵셔널 체이닝. info가 null이어도 오류 없음
  const kcal = info?.[code]?.kcal;
  // [문법] 조건 ? A : B 삼항 연산자 + 템플릿 리터럴. Math.round: 반올림
  return kcal ? `${Math.round(kcal)} kcal` : `${meals[code].menus.length}가지`;
}

// 탭 세 개의 선택 표시·막힘·작은 글자를 지금 값(selected, meals, info)에 맞게 다시 그린다
function renderTabs() {
  // [문법] 배열.forEach(함수): 요소마다 함수를 실행한다(새 배열을 만들지 않는다는 점이 map과 다르다)
  tabs.forEach((tab) => {
    // [문법] 요소.dataset.meal: HTML의 data-meal="2" 속성 값(글자)을 꺼낸다. Number로 숫자로
    const code = Number(tab.dataset.meal);
    const on = code === selected;
    // [문법] 요소.setAttribute(이름, 값): HTML 속성을 정한다. 속성 값은 글자라 String(true) → 'true'
    tab.setAttribute('aria-selected', String(on));
    // 고른 탭만 Tab 키로 들어올 수 있고, 나머지는 화살표 키로 옮겨 다닌다
    // [문법] tabIndex: 0 = Tab 키 순서에 들어감, -1 = 안 들어감(코드로 focus()만 가능)
    tab.tabIndex = on ? 0 : -1;
    // [문법] disabled = true면 버튼을 누를 수 없다
    tab.disabled = isEmptyMeal(code) && !on;
    // [문법] 요소.textContent = 글자: HTML이 아닌 순수 글자로 넣는다(<, > 도 글자 그대로 → 안전)
    tab.querySelector('.meal-tabs__sub').textContent = tabSubText(code);
  });
  // [문법] aria-labelledby: 이 영역의 이름을 그 id 요소(고른 탭)의 글자로 정한다
  panel.setAttribute('aria-labelledby', `meal-tab-${selected}`);
}

// 식사를 바꾼다. 키보드로 옮긴 경우(focus: true)에는 포커스도 새 탭으로 옮긴다
// [문법] { focus = false } = {}: 두 번째 인자 객체에서 focus를 꺼내고 없으면 false(구조 분해 + 기본값)
function selectMeal(code, { focus = false } = {}) {
  selected = code;
  renderTabs();
  renderPanel();
  // [문법] 요소.focus(): 그 요소로 키보드 포커스를 옮긴다
  if (focus) document.getElementById(`meal-tab-${code}`).focus();
}

// 탭 클릭·키보드 동작을 연결한다 (탭마다 따로 연결하지 않고 탭 묶음 하나에서 받는다)
function setupTabs() {
  // [문법] 요소.addEventListener('click', 함수): 클릭할 때마다 함수를 실행. event에 클릭 정보가 들어온다
  // [문법] 탭마다 따로 연결하지 않고 부모 하나에 연결하는 방식을 '이벤트 위임'이라고 한다
  tabList.addEventListener('click', (event) => {
    // [문법] event.target: 실제로 누른 요소. .closest(선택자): 자신부터 위로 올라가며 선택자에 맞는 첫 조상을 찾는다(없으면 null)
    const tab = event.target.closest('[role="tab"]');
    if (tab && !tab.disabled) selectMeal(Number(tab.dataset.meal));
  });

  // ← → Home End 키로 탭을 옮긴다 (막힌 탭은 건너뛴다)
  // [문법] 'keydown': 키보드 키를 누를 때 일어나는 이벤트
  tabList.addEventListener('keydown', (event) => {
    const usable = tabs.filter((tab) => !tab.disabled);
    // [문법] document.activeElement: 지금 포커스된 요소. 배열.indexOf(값): 위치 번호(없으면 -1)
    const index = usable.indexOf(document.activeElement);
    if (index === -1) return;
    // [문법] 키 이름 → 옮겨 갈 위치 번호 표(객체)
    // [문법] % (나머지 연산자): 끝에서 오른쪽으로 가면 0으로 돌아간다. 왼쪽은 + length 를 더해 음수가 안 되게 한다
    const moves = {
      ArrowRight: (index + 1) % usable.length,
      ArrowLeft: (index - 1 + usable.length) % usable.length,
      Home: 0,
      End: usable.length - 1,
    };
    // [문법] '키' in 객체: 객체에 그 키가 있으면 true. event.key는 누른 키 이름('ArrowRight' 등)
    if (!(event.key in moves)) return;
    // [문법] event.preventDefault(): 브라우저 기본 동작(화살표로 화면 스크롤 등)을 막는다
    event.preventDefault();
    selectMeal(Number(usable[moves[event.key]].dataset.meal), { focus: true });
  });
}

// ================= 메뉴 목록 =================

// 메뉴 이름 옆 "★ 4.5 · 2명". 평가가 없으면 아무것도 안 그린다
// [문법] 평가 수가 0이면 빈 글자를 돌려준다(템플릿 안에 넣으면 아무것도 안 보임)
function scoreHtml(menu) {
  if (menu.reviewCount === 0) return '';
  // [문법] 백틱 템플릿 리터럴로 여러 줄 HTML 글자를 만든다. ${...} 자리에 값이 들어간다
  return `
    <p class="dish__score">
      <span class="sr-only">평균 별점 </span><span class="dish__score-star" aria-hidden="true">★</span>
      <strong>${menu.averageRating.toFixed(1)}</strong> · ${menu.reviewCount}명
    </p>`;
}

// 별 다섯 개 버튼. 누르면 바로 등록되고, 이미 남긴 메뉴는 다시 눌러 별점을 고칠 수 있다
// (화살표 키로 실수로 등록되지 않게 라디오 대신 버튼을 쓴다)
function quickRateHtml(menu) {
  // [문법] rated[번호]?.rating: 저장된 별점(없으면 undefined) → ?? 0 으로 0(아직 안 남김)
  const myRating = rated[menu.menuId]?.rating ?? 0;
  // [문법] [1..5].map으로 별 버튼 5개의 HTML 글자를 만들고 .join('')으로 이어 붙인다
  // [문법] ${n <= myRating ? ' is-filled' : ''}: 내 별점 이하인 별에만 클래스를 붙인다
  // [문법] aria-pressed="true/false": 눌린 상태의 토글 버튼이라고 낭독기에 알려 준다
  // [문법] data-rating="${n}": 몇 번째 별인지 HTML에 적어 둔다(클릭할 때 dataset.rating으로 읽음)
  const stars = [1, 2, 3, 4, 5].map((n) => `
    <button type="button" class="quick-rate__star${n <= myRating ? ' is-filled' : ''}" data-rating="${n}"
      aria-pressed="${n === myRating}" aria-label="${n}점, ${RATING_LABELS[n]}">${n <= myRating ? '★' : '☆'}</button>`).join('');
  // [문법] 삼항 연산자로 이미 남겼는지에 따라 묶음 이름(aria-label)을 다르게 만든다
  const label = myRating ? `${escapeHtml(menu.name)} 내 별점 ${myRating}점, 눌러서 바꾸기` : `${escapeHtml(menu.name)} 별점 바로 남기기`;
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
  // [문법] 옵셔널 체이닝(?.)을 이어 써서 중간에 없으면 빈 배열([])
  const allergies = findDish(info?.[selected], menu.name)?.allergies ?? [];
  // [문법] 버튼과 내용 상자를 이어 줄 id 글자(aria-controls에 쓴다)
  const allergyId = `allergy-${menu.menuId}`;
  // [문법] 조건 ? A : B 를 여러 줄에 나눠 썼다. 배열.length가 0이면 거짓 → 빈 글자
  // [문법] aria-expanded: 펼쳐졌는지(true/false), aria-controls: 이 버튼이 여닫는 요소의 id
  const allergyButton = allergies.length
    ? `<button type="button" class="dish__allergy-toggle" aria-expanded="false" aria-controls="${allergyId}">알레르기 확인</button>`
    : '';
  // [문법] hidden 속성: 처음에는 숨겨 둔다. allergies.join(', '): 배열을 쉼표로 이어 한 줄 글자로
  const allergyText = allergies.length
    ? `<p class="dish__allergy" id="${allergyId}" hidden><strong>알레르기</strong> ${escapeHtml(allergies.join(', '))}</p>`
    : '';

  // [문법] 메뉴 한 줄 HTML. data-menu-id: 클릭할 때 어느 메뉴인지 알려고 적어 둔다(dataset.menuId로 읽음)
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

// 칼로리·영양소 줄. 나이스 정보가 없으면 끼니 이름과 가짓수만 보여 준다
// [문법] 칼로리·영양소 HTML 글자를 만든다
function summaryHtml(menus) {
  // [문법] info가 null이면 undefined
  const meal = info?.[selected];
  const label = `<p class="meal-card__label">${MEAL_TYPES[selected]} · ${menus.length}가지</p>`;
  if (!meal) {
    const note = infoFailed ? '<p class="meal-card__note">칼로리·알레르기 정보를 불러오지 못했어요.</p>' : '';
    return `<div class="meal-card__summary"><div>${label}${note}</div></div>`;
  }

  // [문법] 함수를 변수에 담은 화살표 함수. == null 은 null 과 undefined 둘 다 잡는다(느슨한 비교를 일부러 쓴 경우)
  const grams = (value) => (value == null ? '-' : `${value}g`);
  // [문법] [[이름, 값], ...] 2차원 배열 → map((([name, value]) => ...)) 에서 구조 분해로 꺼낸다
  // [문법] <dl>/<dt>/<dd>: 설명 목록(용어 - 설명 짝). 여기서는 영양소 이름 - 값
  const nutrients = [['탄수화물', meal.carb], ['단백질', meal.protein], ['지방', meal.fat]]
    .map(([name, value]) => `<div class="meal-card__nutrient"><dt>${name}</dt><dd>${grams(value)}</dd></div>`)
    .join('');
  // [문법] toFixed(1): 소수 첫째 자리 글자로
  const kcal = meal.kcal == null ? '-' : meal.kcal.toFixed(1);
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
// [문법] 위에서부터 차례로 확인하고, 맞으면 그리고 return으로 끝내는 '빠른 탈출' 방식
function renderPanel() {
  const meal = meals[selected];
  if (!meal) {
    renderLoading(panel, '급식표를 불러오는 중이에요…');
    return;
  }
  if (meal.error) {
    // [문법] () => reloadMeal(selected): '다시 시도'를 누를 때 부를 함수를 넘긴다(지금 바로 실행하지 않음)
    renderError(panel, meal.error, () => reloadMeal(selected));
    return;
  }
  if (meal.menus.length === 0) {
    renderEmpty(panel, '오늘은 급식이 없어요', '<p class="small">주말이나 휴일에는 급식표가 올라오지 않아요. 인기 순위에서 지난 메뉴 평가를 볼 수 있어요.</p>');
    return;
  }
  // [문법] 요소.innerHTML = HTML글자: 안의 내용을 통째로 바꾼다. meal.menus.map(dishHtml)으로 메뉴마다 <li>를 만든다
  panel.innerHTML = `
    <div class="meal-card">
      ${summaryHtml(meal.menus)}
      <ul class="dish-list">${meal.menus.map(dishHtml).join('')}</ul>
    </div>`;
}

// ================= 오늘 인기 TOP 3 =================
// 그리는 코드는 todayTop.js. 여기서는 지금 가진 메뉴 정보(meals)를 넘겨주기만 한다.

// [문법] todayTop.js에서 가져온 함수에 상자와 데이터를 넘긴다
function renderTop() {
  renderTodayTop(topList, meals);
}

// ================= 별점 바로 남기기 · 알레르기 =================

// 별을 눌렀을 때: 처음이면 별점만 있는 평가를 새로 보내고, 이미 남겼으면 그 평가의 별점을 고친다.
// 성공하면 그 메뉴 줄만 새로 그린다. item: 누른 별이 들어 있는 <li class="dish">, rating: 누른 별 번호(1~5)
// [문법] async function: 안에서 await로 서버 응답을 기다리는 비동기 함수
async function quickRate(item, rating) {
  // [문법] 배열.find(조건): 조건에 맞는 첫 요소. item.dataset.menuId는 글자라 Number로 바꿔 비교
  const menu = meals[selected].menus.find((m) => m.menuId === Number(item.dataset.menuId));
  const mine = rated[menu.menuId]; // 이미 남긴 별점 { rating, reviewId, editToken } 또는 undefined
  // [문법] mine이 undefined면 mine?.rating도 undefined라 비교는 false
  if (mine?.rating === rating) return; // 같은 별을 다시 누르면 아무것도 안 한다

  // [문법] querySelectorAll: 이 메뉴 줄 안의 별 버튼 전부
  const buttons = item.querySelectorAll('.quick-rate__star');
  const errorBox = item.querySelector('.dish__error');
  // [문법] NodeList도 forEach를 쓸 수 있다. 화살표 함수 몸통이 { } 블록이면 return 값이 없다
  buttons.forEach((button) => { button.disabled = true; }); // 두 번 누르기 방지
  errorBox.textContent = '';

  // [문법] Boolean(값): 참·거짓으로 바꾼다. 수정에 필요한 두 값이 다 있으면 true
  const editing = Boolean(mine?.reviewId && mine.editToken); // 고칠 수 있는 평가가 있으면 수정
  // [문법] let 변수;: 값 없이 선언(undefined). 등록했을 때만 값이 들어간다
  let saved;
  try {
    if (editing) {
      // [문법] await: 서버 응답이 올 때까지 기다린다. 실패하면 오류가 던져져 아래 catch로 간다
      await updateReviewRating(mine.reviewId, rating, mine.editToken);
    } else {
      // [문법] 객체 리터럴을 바로 인자로 넘긴다. null: '값이 없음'을 직접 표시하는 값
      saved = await createReview({
        menuId: menu.menuId,
        rating,
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
    // [문법] err.message: 던져진 Error 객체의 메시지 글자
    errorBox.textContent = err.message;
    buttons.forEach((button) => { button.disabled = false; });
    return;
  }

  // 서버에 다시 묻지 않고 평균·평가 수를 고친다 (수정이면 평가 수는 그대로, 예전 별점만 새 별점으로 바꿔 계산)
  // [문법] 평균 × 개수 = 합계. 여기서 하나를 바꾸거나 더해 새 평균을 계산한다
  const total = menu.averageRating * menu.reviewCount;
  if (editing) {
    menu.averageRating = Math.round(((total - mine.rating + rating) / menu.reviewCount) * 10) / 10;
    // [문법] { ...mine, rating }: mine을 복사하고 rating만 새 값으로 덮어쓴 새 객체
    rated[menu.menuId] = { ...mine, rating };
  } else {
    menu.averageRating = Math.round(((total + rating) / (menu.reviewCount + 1)) * 10) / 10;
    // [문법] += 1: 1을 더해서 다시 넣는다
    menu.reviewCount += 1;
    rated[menu.menuId] = { rating, reviewId: saved.reviewId, editToken: saved.editToken };
  }
  saveRated();

  // 목록 전체를 다시 그리지 않고 이 메뉴만 바꾼다
  item.querySelector('.dish__rate').innerHTML = quickRateHtml(menu);
  // [문법] ?.remove(): 요소가 있으면 지우고, 없으면(null) 아무 일도 안 한다
  item.querySelector('.dish__score')?.remove();
  // [문법] insertAdjacentHTML('beforeend', HTML): 요소 안 맨 뒤에 HTML을 끼워 넣는다
  item.querySelector('.dish__top').insertAdjacentHTML('beforeend', scoreHtml(menu));
  // 화면에는 안 보이고(sr-only) 화면 낭독기만 읽는 결과 문구
  // [문법] 템플릿 리터럴 두 개 중 하나를 삼항 연산자로 고른다
  item.querySelector('.dish__status').textContent = editing ? `${rating}점으로 바꿨어요` : `${rating}점 남겼어요`;
  // 별 버튼을 새로 그렸으니 방금 누른 별에 다시 포커스를 둔다
  // [문법] 템플릿 리터럴로 선택자 글자를 만든다 → 방금 누른 번호의 별 버튼을 찾아 포커스
  item.querySelector(`.quick-rate__star[data-rating="${rating}"]`).focus();
  renderTop();
}

// 메뉴 목록 안의 클릭(별 버튼, 알레르기 열기/닫기)을 한 곳에서 받는다.
// 목록은 innerHTML로 계속 새로 그려지므로, 버튼마다가 아니라 바깥 상자(panel)에 연결해야 한다
// [문법] 이벤트 위임: 목록 바깥 상자 하나에 클릭을 연결해 두면, 나중에 새로 그린 버튼도 따로 연결할 필요가 없다
function setupPanel() {
  panel.addEventListener('click', (event) => {
    // [문법] 누른 곳에서 가장 가까운 별 버튼(없으면 null)
    const star = event.target.closest('.quick-rate__star');
    if (star) {
      // [문법] async 함수를 await 없이 부르면 기다리지 않고 바로 다음 줄로 간다
      quickRate(star.closest('.dish'), Number(star.dataset.rating));
      return;
    }

    // 알레르기 버튼: 누를 때마다 열고 닫는다 (aria-expanded로 낭독기에도 열림/닫힘을 알린다)
    const toggle = event.target.closest('.dish__allergy-toggle');
    if (toggle) {
      // [문법] getAttribute(이름): 속성 값(글자). 지금 열려 있지 않으면 → 열 차례(true)
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '알레르기 닫기' : '알레르기 확인';
      // [문법] 요소.hidden = true/false: 숨기기/보이기
      document.getElementById(toggle.getAttribute('aria-controls')).hidden = !open;
    }
  });
}

// ================= 불러오기 =================

// Promise.allSettled 결과 하나 → meals에 넣을 값 ({ menus } 또는 { error })
// [문법] Promise.allSettled 결과 하나: { status: 'fulfilled', value } (성공) 또는 { status: 'rejected', reason } (실패)
function toMealResult(result) {
  return result.status === 'fulfilled' ? { menus: result.value.menus } : { error: result.reason.message };
}

// 나이스 정보는 덧붙이는 정보라서, 실패해도 메뉴와 평가는 그대로 보여 준다
// [문법] async: 나이스 정보를 기다렸다가 탭·목록을 다시 그린다
async function loadInfo() {
  try {
    // [문법] await: Promise가 끝날 때까지 기다리고 결과를 꺼낸다
    info = await getMealInfo(date);
    infoFailed = false;
  } catch {
    info = null;
    infoFailed = true;
  }
  renderTabs();
  renderPanel();
}

// 실패한 식사 하나만 다시 불러온다 ("다시 시도" 버튼)
// [문법] 실패한 식사 하나만 다시 불러오는 비동기 함수
async function reloadMeal(code) {
  // [문법] undefined를 넣어 '불러오는 중' 상태로 되돌린다
  meals[code] = undefined;
  renderTabs();
  renderPanel();
  // [문법] Promise.allSettled([Promise들]): 모두 끝날 때까지(성공이든 실패든) 기다려 결과 배열을 준다
  // [문법] const [result] = 배열: 배열 구조 분해로 첫 번째만 꺼낸다
  const [result] = await Promise.allSettled([getTodayMenus(code)]);
  meals[code] = toMealResult(result);
  // [문법] &&: 두 조건 모두 참일 때. !date: 아직 날짜를 모르면
  if (result.status === 'fulfilled' && !date) {
    date = result.value.date;
    dateText.textContent = formatDate(date);
    // [문법] await 없이 불러서 기다리지 않고 진행한다(끝나면 알아서 다시 그림)
    loadInfo();
  }
  renderTabs();
  renderPanel();
  renderTop();
}

// 페이지를 열면 한 번 실행된다
// [문법] 페이지가 열리면 한 번 실행되는 시작 함수
async function start() {
  selected = mealByTime();
  renderTabs();
  renderPanel();
  renderLoading(topList, '순위를 모으는 중이에요…');

  // 세 끼를 동시에 부른다. 하나가 실패해도 나머지는 보여 준다
  // [문법] 세 요청을 '동시에' 보내고 셋 다 끝날 때까지 기다린다
  const results = await Promise.allSettled(MEAL_CODES.map((code) => getTodayMenus(code)));
  // [문법] forEach의 두 번째 인자 index로 같은 순서의 결과를 짝지어 넣는다
  MEAL_CODES.forEach((code, index) => { meals[code] = toMealResult(results[index]); });

  // [문법] 성공한 결과 중 첫 번째(날짜를 얻으려고)
  const ok = results.find((result) => result.status === 'fulfilled');
  if (ok) {
    date = ok.value.date;
    dateText.textContent = formatDate(date);
  }

  // 지금 시각의 식사가 없으면 급식이 있는 다른 식사를 먼저 보여 준다
  if (!hasMenus(selected)) {
    // [문법] find(hasMenus): 함수 이름을 그대로 넘긴다. 없으면 ?? 로 원래 값을 유지
    selected = MEAL_CODES.find(hasMenus) ?? selected;
  }
  renderTabs();
  renderPanel();
  renderTop();

  // [문법] 날짜를 알 때만 나이스 정보를 부른다
  if (date) loadInfo();
}

// [문법] 파일 맨 아래에서 함수들을 차례로 불러 페이지를 시작한다(모듈은 HTML을 다 읽은 뒤 실행되므로 요소가 이미 있다)
setupTabs();
setupPanel();
start();
