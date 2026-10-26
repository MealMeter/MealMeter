// 역할: 메인 페이지 동작 — 오늘의 메뉴를 불러와 메뉴 카드로 보여 준다 (명세서 3장 기능 1). 담당: 김태건
// 카드의 "평가하기"를 누르면 menu.html?menuId=번호 로 이동한다.
import { getTodayMenus } from '../api/index.js';
import { escapeHtml, formatDate } from '../common/format.js';
import { loadData, renderEmpty } from '../common/state.js';
import { linkButtonHtml, starRatingHtml } from '../common/ui.js';

// HTML에서 내용을 채울 자리를 찾아 둔다
const dateText = document.getElementById('main-date');
const menusBox = document.getElementById('main-menus');

// 메뉴 카드 하나 (메뉴 이름 + 평균 별점 + 평가 수 + "평가하기" 버튼)
function menuCardHtml(menu) {
  const rating = menu.reviewCount > 0
    ? `${starRatingHtml(menu.averageRating)}<span class="muted small">평가 ${menu.reviewCount}개</span>`
    : '<span class="muted small">아직 평가가 없어요. 첫 평가를 남겨 보세요</span>';

  return `
    <li class="card menu-card">
      <h3 class="menu-card__name">${escapeHtml(menu.name)}</h3>
      <div class="menu-card__rating">${rating}</div>
      ${linkButtonHtml(`/menu.html?menuId=${encodeURIComponent(menu.menuId)}`, '평가하기', {
        // 버튼 글자가 모두 "평가하기"라서, 화면 낭독기에는 어떤 메뉴인지 같이 알려 준다
        ariaLabel: `${menu.name} 평가하기`,
      })}
    </li>`;
}

// 서버에서 받은 데이터로 화면을 그린다. data = { date, mealType, menus: [...] }
function render(data) {
  dateText.textContent = `${formatDate(data.date)} · ${data.mealType}`;

  if (data.menus.length === 0) {
    renderEmpty(menusBox, '오늘은 급식 정보가 없어요');
    return;
  }

  menusBox.innerHTML = `
    <h2 class="small muted">${escapeHtml(data.mealType)} · ${data.menus.length}가지</h2>
    <ul class="main-page__menus">${data.menus.map(menuCardHtml).join('')}</ul>`;
}

// 페이지가 열리면 바로 불러온다 (불러오는 중 → 성공하면 render, 실패하면 오류 + 다시 시도)
loadData(menusBox, () => getTodayMenus(), render, '오늘의 메뉴를 불러오는 중이에요');
