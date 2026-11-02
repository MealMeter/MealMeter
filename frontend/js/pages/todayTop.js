// 역할: 메인 페이지 아래쪽 "오늘 인기 TOP 3" 상자를 그린다. 담당: 조현우
// 인기 순위 페이지와 같은 "순위" 기능이라 순위 담당이 맡는다. 메인 페이지(main.js)가 메뉴를 불러온 뒤 이 함수를 부른다.
//
// renderTodayTop(상자, meals) → 상자 안에 TOP 3 목록(또는 안내 문구)을 그린다
//   meals 모양: { 1: { menus: [...] } 또는 { error: '메시지' }, 2: …, 3: … }  (main.js가 가진 값 그대로)
import { MEAL_TYPES } from '../api/reviewFields.js';
import { escapeHtml } from '../common/format.js';
import { dishIcon } from '../common/ui.js';

// 식사 코드 목록 [1, 2, 3] (조식·중식·석식)
const MEAL_CODES = Object.keys(MEAL_TYPES).map(Number);

// 세 끼를 모두 모아 평가가 있는 메뉴만, 평균 별점 → 평가 수 순서로 3개 고른다
function pickTop(meals) {
  const seen = new Set(); // 이미 넣은 메뉴 이름 (같은 이름이 두 끼에 나오면 한 번만 넣는다)
  return MEAL_CODES
    // 끼니마다 메뉴를 꺼내고, 상세 페이지 링크에 쓸 식사 코드(code)를 붙인다
    .flatMap((code) => (meals[code]?.menus ?? []).map((menu) => ({ ...menu, code })))
    // 평가가 하나도 없는 메뉴와 이름이 겹치는 메뉴는 뺀다
    .filter((menu) => menu.reviewCount > 0 && !seen.has(menu.name) && seen.add(menu.name))
    // 별점이 같으면 평가가 많은 쪽을 위로
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, 3);
}

// TOP 3의 한 줄 (순위 숫자, 그림 글자, 메뉴 이름 링크, 평균 별점)
function itemHtml(menu, index) {
  return `
    <li class="today-top__item">
      <span class="today-top__rank"><span class="sr-only">순위 </span>${index + 1}</span>
      <span class="today-top__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
      <a class="today-top__name" href="/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${menu.code}">${escapeHtml(menu.name)}</a>
      <span class="today-top__score"><span aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${menu.averageRating.toFixed(1)}</strong></span>
    </li>`;
}

export function renderTodayTop(container, meals) {
  if (!MEAL_CODES.some((code) => meals[code]?.menus)) {
    // 세 끼 모두 불러오지 못했으면 "평가가 없다"고 하지 않는다 (위 오류 안내의 "다시 시도"로 해결)
    container.innerHTML = '<p class="today-top__empty">메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요.</p>';
    return;
  }

  const list = pickTop(meals);
  if (list.length === 0) {
    container.innerHTML = '<p class="today-top__empty">아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요.</p>';
    return;
  }
  container.innerHTML = `<ol class="today-top__list">${list.map(itemHtml).join('')}</ol>`;
}
