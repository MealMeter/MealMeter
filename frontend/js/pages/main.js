// 역할: 메인 페이지 동작 — 오늘의 메뉴 (명세서 3장 기능 1). 담당: 김태건
// 순서: 서버에서 조식·중식·석식 메뉴를 한 번에 불러온다 → 고른 식사를 그린다 → 나이스에서 칼로리·알레르기를 받아 덧붙인다.
// 별을 누르면 바로 평가가 등록된다 (별점만 있는 평가). 태그·의견은 메뉴 이름을 눌러 상세 페이지에서 남긴다.
import { createReview, getMealInfo, getTodayMenus } from '../api/index.js';
import { findDish } from '../api/neis.js';
import { MEAL_TYPES, RATING_LABELS } from '../api/reviewFields.js';
import { escapeHtml, formatDate } from '../common/format.js';
import { renderEmpty, renderError, renderLoading } from '../common/state.js';
import { dishIcon } from '../common/ui.js';

const MEAL_CODES = [1, 2, 3];
const RATED_KEY = 'mealmeter-quick-ratings'; // 바로 남긴 별점을 기억하는 브라우저 저장소 이름

// HTML에서 내용을 채울 자리를 찾아 둔다
const dateText = document.getElementById('today-date');
const tabList = document.getElementById('meal-tabs');
const tabs = [...tabList.querySelectorAll('[role="tab"]')];
const panel = document.getElementById('meal-panel');
const topList = document.getElementById('today-top-list');

// ---------- 페이지가 기억하는 값 ----------
// meals[식사코드] = { menus: [...] } (성공) 또는 { error: '메시지' } (실패)
let meals = {};
let date = null; // 서버가 정한 오늘 날짜 "2026-10-27"
let info = null; // 나이스 정보 { 1: MealInfo, 2: …, 3: … }. 아직 없거나 실패하면 null
let infoFailed = false;
let selected = null; // 지금 고른 식사 코드

// 이 브라우저에서 이미 바로 별점을 남긴 메뉴 { menuId: 별점 }. 같은 메뉴에 여러 번 누르지 않게 한다
function loadRated() {
  try {
    return JSON.parse(localStorage.getItem(RATED_KEY)) || {};
  } catch {
    return {}; // 저장소를 못 쓰는 환경(비공개 창 등)이면 기억 없이 동작한다
  }
}
const rated = loadRated();

function saveRated() {
  try {
    localStorage.setItem(RATED_KEY, JSON.stringify(rated));
  } catch {
    // 저장에 실패해도 지금 화면에서는 계속 동작한다
  }
}

// 지금 시각에 맞는 식사 (9시 전 조식, 14시 전 중식, 그 뒤 석식)
function mealByTime() {
  const hour = new Date().getHours();
  if (hour < 9) return 1;
  if (hour < 14) return 2;
  return 3;
}

// ================= 식사 탭 =================

function hasMenus(code) {
  return (meals[code]?.menus?.length ?? 0) > 0;
}

// 급식이 없다고 확실히 아는 탭만 막는다 (불러오기에 실패한 탭은 눌러서 다시 시도할 수 있게 둔다)
function isEmptyMeal(code) {
  return meals[code]?.menus?.length === 0;
}

function tabSubText(code) {
  if (!meals[code]) return '…';
  if (meals[code].error) return '불러오기 실패';
  if (isEmptyMeal(code)) return '없음';
  const kcal = info?.[code]?.kcal;
  return kcal ? `${Math.round(kcal)} kcal` : `${meals[code].menus.length}가지`;
}

function renderTabs() {
  tabs.forEach((tab) => {
    const code = Number(tab.dataset.meal);
    const on = code === selected;
    tab.setAttribute('aria-selected', String(on));
    // 고른 탭만 Tab 키로 들어올 수 있고, 나머지는 화살표 키로 옮겨 다닌다
    tab.tabIndex = on ? 0 : -1;
    tab.disabled = isEmptyMeal(code) && !on;
    tab.querySelector('.meal-tabs__sub').textContent = tabSubText(code);
  });
  panel.setAttribute('aria-labelledby', `meal-tab-${selected}`);
}

function selectMeal(code, { focus = false } = {}) {
  selected = code;
  renderTabs();
  renderPanel();
  if (focus) document.getElementById(`meal-tab-${code}`).focus();
}

function setupTabs() {
  tabList.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && !tab.disabled) selectMeal(Number(tab.dataset.meal));
  });

  // ← → Home End 키로 탭을 옮긴다 (막힌 탭은 건너뛴다)
  tabList.addEventListener('keydown', (event) => {
    const usable = tabs.filter((tab) => !tab.disabled);
    const index = usable.indexOf(document.activeElement);
    if (index === -1) return;
    const moves = {
      ArrowRight: (index + 1) % usable.length,
      ArrowLeft: (index - 1 + usable.length) % usable.length,
      Home: 0,
      End: usable.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    selectMeal(Number(usable[moves[event.key]].dataset.meal), { focus: true });
  });
}

// ================= 메뉴 목록 =================

function scoreHtml(menu) {
  if (menu.reviewCount === 0) return '';
  return `
    <p class="dish__score">
      <span class="sr-only">평균 별점 </span><span class="dish__score-star" aria-hidden="true">★</span>
      <strong>${menu.averageRating.toFixed(1)}</strong> · ${menu.reviewCount}명
    </p>`;
}

// 별 다섯 개 버튼. 누르면 바로 등록된다 (화살표 키로 실수로 등록되지 않게 라디오 대신 버튼을 쓴다)
function quickRateHtml(menu) {
  const myRating = rated[menu.menuId];
  if (myRating) {
    return `<span class="quick-rate__done" aria-hidden="true">${'★'.repeat(myRating)}${'☆'.repeat(5 - myRating)}</span>`;
  }
  const stars = [1, 2, 3, 4, 5].map((n) => `
    <button type="button" class="quick-rate__star" data-rating="${n}"
      aria-label="${n}점, ${RATING_LABELS[n]}">☆</button>`).join('');
  return `<div class="quick-rate" role="group" aria-label="${escapeHtml(menu.name)} 별점 바로 남기기">${stars}</div>`;
}

function detailHref(menu) {
  return `/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${selected}`;
}

// 바로 평가 상태 문구 (role="status" 자리는 그대로 두고 글자만 바꿔야 화면 낭독기가 읽는다)
function statusHtml(menu) {
  const myRating = rated[menu.menuId];
  if (myRating) {
    return `<span>✓ ${myRating}점 남겼어요</span><a class="dish__more" href="${detailHref(menu)}">태그·의견 더하기</a>`;
  }
  return `<span class="dish__prompt">${menu.reviewCount > 0 ? '별을 눌러 바로 평가해요' : '아직 평가가 없어요. 첫 평가를 남겨 보세요'}</span>`;
}

function dishHtml(menu) {
  const allergies = findDish(info?.[selected], menu.name)?.allergies ?? [];
  const allergyId = `allergy-${menu.menuId}`;
  const allergyButton = allergies.length
    ? `<button type="button" class="dish__allergy-toggle" aria-expanded="false" aria-controls="${allergyId}">알레르기 확인</button>`
    : '';
  const allergyText = allergies.length
    ? `<p class="dish__allergy" id="${allergyId}" hidden><strong>알레르기</strong> ${escapeHtml(allergies.join(', '))}</p>`
    : '';

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
          <p class="dish__status" role="status">${statusHtml(menu)}</p>
          ${allergyButton}
        </div>
        <p class="dish__error" role="alert"></p>
      </div>
    </li>`;
}

// 칼로리·영양소 줄. 나이스 정보가 없으면 끼니 이름과 가짓수만 보여 준다
function summaryHtml(menus) {
  const meal = info?.[selected];
  const label = `<p class="meal-card__label">${MEAL_TYPES[selected]} · ${menus.length}가지</p>`;
  if (!meal) {
    const note = infoFailed ? '<p class="meal-card__note">칼로리·알레르기 정보를 불러오지 못했어요.</p>' : '';
    return `<div class="meal-card__summary"><div>${label}${note}</div></div>`;
  }

  const grams = (value) => (value == null ? '-' : `${value}g`);
  const nutrients = [['탄수화물', meal.carb], ['단백질', meal.protein], ['지방', meal.fat]]
    .map(([name, value]) => `<div class="meal-card__nutrient"><dt>${name}</dt><dd>${grams(value)}</dd></div>`)
    .join('');
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

function renderPanel() {
  const meal = meals[selected];
  if (!meal) {
    renderLoading(panel, '급식표를 불러오는 중이에요…');
    return;
  }
  if (meal.error) {
    renderError(panel, meal.error, () => reloadMeal(selected));
    return;
  }
  if (meal.menus.length === 0) {
    renderEmpty(panel, '오늘은 급식이 없어요', '<p class="small">주말이나 휴일에는 급식표가 올라오지 않아요. 인기 순위에서 지난 메뉴 평가를 볼 수 있어요.</p>');
    return;
  }
  panel.innerHTML = `
    <div class="meal-card">
      ${summaryHtml(meal.menus)}
      <ul class="dish-list">${meal.menus.map(dishHtml).join('')}</ul>
    </div>`;
}

// ================= 오늘 인기 TOP 3 =================

function renderTop() {
  // 세 끼를 모두 모아 평가가 있는 메뉴만, 평균 별점 → 평가 수 순서로 3개
  const seen = new Set();
  const list = MEAL_CODES.flatMap((code) => (meals[code]?.menus ?? []).map((menu) => ({ ...menu, code })))
    .filter((menu) => menu.reviewCount > 0 && !seen.has(menu.name) && seen.add(menu.name))
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, 3);

  if (!MEAL_CODES.some((code) => meals[code]?.menus)) {
    // 세 끼 모두 불러오지 못했으면 "평가가 없다"고 하지 않는다 (위 오류 안내의 "다시 시도"로 해결)
    topList.innerHTML = '<p class="today-top__empty">메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요.</p>';
    return;
  }
  if (list.length === 0) {
    topList.innerHTML = '<p class="today-top__empty">아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요.</p>';
    return;
  }
  topList.innerHTML = `
    <ol class="today-top__list">
      ${list.map((menu, index) => `
        <li class="today-top__item">
          <span class="today-top__rank"><span class="sr-only">순위 </span>${index + 1}</span>
          <span class="today-top__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
          <a class="today-top__name" href="/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${menu.code}">${escapeHtml(menu.name)}</a>
          <span class="today-top__score"><span aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${menu.averageRating.toFixed(1)}</strong></span>
        </li>`).join('')}
    </ol>`;
}

// ================= 별점 바로 남기기 · 알레르기 =================

async function quickRate(item, rating) {
  const menu = meals[selected].menus.find((m) => m.menuId === Number(item.dataset.menuId));
  const buttons = item.querySelectorAll('.quick-rate__star');
  const errorBox = item.querySelector('.dish__error');
  buttons.forEach((button) => { button.disabled = true; }); // 두 번 누르기 방지
  errorBox.textContent = '';

  try {
    await createReview({
      menuId: menu.menuId,
      rating,
      saltiness: null,
      portion: null,
      temperature: null,
      texture: null,
      hygiene: null,
      comment: '',
    });
  } catch (err) {
    // 서버가 보낸 메시지를 그대로 보여 준다
    errorBox.textContent = err.message;
    buttons.forEach((button) => { button.disabled = false; });
    return;
  }

  rated[menu.menuId] = rating;
  saveRated();
  // 서버에 다시 묻지 않고 평균·평가 수를 고친다
  menu.averageRating = Math.round(((menu.averageRating * menu.reviewCount + rating) / (menu.reviewCount + 1)) * 10) / 10;
  menu.reviewCount += 1;

  // 목록 전체를 다시 그리지 않고 이 메뉴만 바꾼다 (상태 문구 자리를 남겨야 낭독기가 읽어 준다)
  item.querySelector('.dish__rate').innerHTML = quickRateHtml(menu);
  item.querySelector('.dish__score')?.remove();
  item.querySelector('.dish__top').insertAdjacentHTML('beforeend', scoreHtml(menu));
  item.querySelector('.dish__status').innerHTML = statusHtml(menu);
  // 누른 별 버튼이 사라졌으니 포커스를 "태그·의견 더하기" 링크로 옮긴다
  item.querySelector('.dish__more').focus();
  renderTop();
}

function setupPanel() {
  panel.addEventListener('click', (event) => {
    const star = event.target.closest('.quick-rate__star');
    if (star) {
      quickRate(star.closest('.dish'), Number(star.dataset.rating));
      return;
    }

    const toggle = event.target.closest('.dish__allergy-toggle');
    if (toggle) {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '알레르기 닫기' : '알레르기 확인';
      document.getElementById(toggle.getAttribute('aria-controls')).hidden = !open;
    }
  });
}

// ================= 불러오기 =================

function toMealResult(result) {
  return result.status === 'fulfilled' ? { menus: result.value.menus } : { error: result.reason.message };
}

// 나이스 정보는 덧붙이는 정보라서, 실패해도 메뉴와 평가는 그대로 보여 준다
async function loadInfo() {
  try {
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
async function reloadMeal(code) {
  meals[code] = undefined;
  renderTabs();
  renderPanel();
  const [result] = await Promise.allSettled([getTodayMenus(code)]);
  meals[code] = toMealResult(result);
  if (result.status === 'fulfilled' && !date) {
    date = result.value.date;
    dateText.textContent = formatDate(date);
    loadInfo();
  }
  renderTabs();
  renderPanel();
  renderTop();
}

async function start() {
  selected = mealByTime();
  renderTabs();
  renderPanel();
  renderLoading(topList, '순위를 모으는 중이에요…');

  // 세 끼를 동시에 부른다. 하나가 실패해도 나머지는 보여 준다
  const results = await Promise.allSettled(MEAL_CODES.map((code) => getTodayMenus(code)));
  MEAL_CODES.forEach((code, index) => { meals[code] = toMealResult(results[index]); });

  const ok = results.find((result) => result.status === 'fulfilled');
  if (ok) {
    date = ok.value.date;
    dateText.textContent = formatDate(date);
  }

  // 지금 시각의 식사가 없으면 급식이 있는 다른 식사를 먼저 보여 준다
  if (!hasMenus(selected)) {
    selected = MEAL_CODES.find(hasMenus) ?? selected;
  }
  renderTabs();
  renderPanel();
  renderTop();

  if (date) loadInfo();
}

setupTabs();
setupPanel();
start();
