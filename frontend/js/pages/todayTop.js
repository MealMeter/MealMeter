// 역할: 메인 페이지 아래쪽 "오늘 인기 TOP 3" 상자를 그린다. 담당: 김태건
// 메인 페이지(main.js)가 메뉴를 불러온 뒤 이 함수를 부른다.
//
// renderTodayTop(상자, meals) → 상자 안에 TOP 3 목록(또는 안내 문구)을 그린다
//   meals 모양: { 1: { menus: [...] } 또는 { error: '메시지' }, 2: …, 3: … }  (main.js가 가진 값 그대로)
// [문법] import { 이름 } from '경로': 다른 파일이 export한 값을 가져온다. '../'는 한 단계 위 폴더
import { escapeHtml } from '../common/format.js';
import { dishIcon } from '../common/ui.js';

// 식사 코드 목록 (1 조식 / 2 중식 / 3 석식)
const MEAL_CODES = [1, 2, 3];

// 그 식사의 메뉴 배열. 아직 없거나 불러오기에 실패했으면 null
function menusOf(meals, code) {
  const meal = meals[code];
  if (meal && meal.menus) return meal.menus;
  return null;
}

// 순위 정렬 기준: 평균 별점이 높은 쪽이 위, 별점이 같으면 평가가 많은 쪽이 위
// [문법] sort의 비교 함수: 음수를 돌려주면 a가 앞, 양수면 b가 앞. b - a 는 큰 값이 앞(내림차순)
function compareMenus(a, b) {
  if (a.averageRating !== b.averageRating) {
    return b.averageRating - a.averageRating;
  }
  return b.reviewCount - a.reviewCount;
}

// 세 끼를 모두 모아 평가가 있는 메뉴만, 평균 별점 → 평가 수 순서로 3개 고른다
function pickTop(meals) {
  const list = [];
  const seenNames = []; // 이미 넣은 메뉴 이름 (같은 이름이 두 끼에 나오면 한 번만 넣는다)

  for (const code of MEAL_CODES) {
    const menus = menusOf(meals, code);
    if (!menus) continue; // [문법] continue: 이번 반복은 건너뛰고 다음으로

    for (const menu of menus) {
      // 평가가 하나도 없는 메뉴와 이름이 겹치는 메뉴는 뺀다
      if (menu.reviewCount === 0) continue;
      if (seenNames.includes(menu.name)) continue;
      seenNames.push(menu.name);
      // 상세 페이지 링크에 쓸 식사 코드(code)도 같이 담는다
      list.push({
        menuId: menu.menuId,
        name: menu.name,
        averageRating: menu.averageRating,
        reviewCount: menu.reviewCount,
        code: code,
      });
    }
  }

  // [문법] 배열.sort(비교함수): 배열을 정렬한다. slice(0, 3): 앞의 3개만 잘라 낸 새 배열
  list.sort(compareMenus);
  return list.slice(0, 3);
}

// TOP 3의 한 줄 (순위 숫자, 그림 글자, 메뉴 이름 링크, 평균 별점). rank는 1부터 시작하는 순위
function itemHtml(menu, rank) {
  // [문법] encodeURIComponent(값): 주소(URL)에 넣어도 안전한 글자로 바꾼다(공백·한글 등)
  // [문법] .toFixed(1): 소수 첫째 자리까지 글자로 (4 → '4.0')
  // [문법] <span class="sr-only">: 화면에는 안 보이고 낭독기만 읽는 글자 / aria-hidden="true": 낭독기가 읽지 않는 장식
  return `
    <li class="today-top__item">
      <span class="today-top__rank"><span class="sr-only">순위 </span>${rank}</span>
      <span class="today-top__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
      <a class="today-top__name" href="/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${menu.code}">${escapeHtml(menu.name)}</a>
      <span class="today-top__score"><span aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${menu.averageRating.toFixed(1)}</strong></span>
    </li>`;
}

// [문법] export: main.js가 import 해서 부를 수 있게 내보낸다. container는 HTML 요소, meals는 세 끼 데이터
export function renderTodayTop(container, meals) {
  // 메뉴를 불러온 끼니가 하나라도 있는지 확인한다
  let loadedAny = false;
  for (const code of MEAL_CODES) {
    if (menusOf(meals, code)) loadedAny = true;
  }
  if (!loadedAny) {
    // 세 끼 모두 불러오지 못했으면 "평가가 없다"고 하지 않는다 (위 오류 안내의 "다시 시도"로 해결)
    container.innerHTML = '<p class="today-top__empty">메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요.</p>';
    return;
  }

  const list = pickTop(meals);
  if (list.length === 0) {
    container.innerHTML = '<p class="today-top__empty">아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요.</p>';
    return;
  }

  let items = '';
  // [문법] i는 0부터 시작해서, 화면에 보이는 순위는 i + 1
  for (let i = 0; i < list.length; i += 1) {
    items += itemHtml(list[i], i + 1);
  }
  container.innerHTML = `<ol class="today-top__list">${items}</ol>`;
}
