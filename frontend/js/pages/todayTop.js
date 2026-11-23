// ============================================================================
// 📄 todayTop.js — 메인 페이지 아래쪽 "오늘 인기 TOP 3" 상자                     담당: 김태건
// ============================================================================
//
// 🏆 하는 일
//   오늘 조식·중식·석식 메뉴를 전부 모아서, 평가가 있는 메뉴 중 별점 높은 순으로 3개를 보여 준다.
//
// 🔗 누가 부르나?
//   메인 페이지(main.js)가 메뉴를 불러온 뒤, 그리고 별점을 남길 때마다 renderTodayTop()을 부른다.
//   이 파일은 서버를 직접 부르지 않는다. main.js가 이미 가진 데이터(meals)를 받아서 그리기만 한다.
//
// 📦 이 파일이 내보내는 것
//   renderTodayTop(상자, meals) → 상자 안에 TOP 3 목록(또는 안내 문구)을 그린다
//
// 📦 meals 모양 (main.js가 가진 값 그대로)
//   {
//     1: { menus: [ { menuId, name, averageRating, reviewCount }, ... ] },   ← 성공한 끼니
//     2: { menus: [...] },
//     3: { error: '석식을 불러오지 못했어요' }                               ← 실패한 끼니
//   }
//
// 📏 순위 규칙
//   1) 평가가 하나도 없는 메뉴는 뺀다 (0점짜리가 순위에 오르면 이상하니까)
//   2) 같은 이름이 여러 끼니에 나오면(예: 조식·석식 둘 다 "쌀밥") 한 번만 넣는다
//   3) 평균 별점이 높은 순. 별점이 같으면 평가 수가 많은 순
//   4) 위에서부터 3개
// ============================================================================

// [문법] import { 이름 } from '경로': 다른 파일이 export한 값을 가져온다. '../'는 한 단계 위 폴더
import { escapeHtml } from '../common/format.js'; // 메뉴 이름을 안전하게 HTML에 넣기
import { dishIcon } from '../common/ui.js'; // 메뉴 이름 → 그림 글자

// 식사 번호 목록 (1 조식 / 2 중식 / 3 석식). 이 순서대로 메뉴를 모은다
const MEAL_CODES = [1, 2, 3];

// ----------------------------------------------------------------------------
// menusOf(meals, code) — 한 끼니의 메뉴 배열을 꺼낸다
//
//   돌려주는 값: 메뉴 배열. 아직 불러오는 중이거나(undefined) 실패했으면({ error }) null
//   예) menusOf(meals, 2) → [ {닭갈비}, {김치} ]
//       menusOf(meals, 3) → null   (석식 불러오기 실패)
// ----------------------------------------------------------------------------
function menusOf(meals, code) {
  const meal = meals[code];
  // 끼니 정보가 있고, 그 안에 menus가 있을 때만 돌려준다
  if (meal && meal.menus) return meal.menus;
  return null;
}

// ----------------------------------------------------------------------------
// compareMenus(a, b) — 두 메뉴 중 누가 순위가 높은지 정하는 "심판" 함수 (sort에서 쓴다)
//
//   규칙: 평균 별점이 높은 쪽이 앞. 별점이 같으면 평가가 많은 쪽이 앞.
//
//   [문법] 배열.sort(심판함수)는 두 개씩 짝지어 심판에게 물어본다.
//          심판이 음수를 돌려주면 → a를 앞에,  양수면 → b를 앞에,  0이면 → 그대로
//          b - a 처럼 뒤에서 앞을 빼면 "큰 값이 앞"(내림차순)이 된다.
//   예) a 별점 4.0, b 별점 4.5 → b - a = 0.5 (양수) → b(4.5)가 앞으로
// ----------------------------------------------------------------------------
function compareMenus(a, b) {
  // 별점이 다르면 별점으로 결정
  if (a.averageRating !== b.averageRating) {
    return b.averageRating - a.averageRating;
  }
  // 별점이 같으면 평가 수로 결정
  return b.reviewCount - a.reviewCount;
}

// ----------------------------------------------------------------------------
// pickTop(meals) — 세 끼 메뉴를 모아 TOP 3를 고른다 (위의 "순위 규칙" 1~4)
//
//   돌려주는 값: 최대 3개짜리 배열. 각 칸은 { menuId, name, averageRating, reviewCount, code }
//               code(식사 번호)는 상세 페이지 링크(menu.html?menuId=3&meal=2)를 만들 때 쓴다
// ----------------------------------------------------------------------------
function pickTop(meals) {
  const list = []; // 후보 메뉴들을 담을 목록
  const seenNames = []; // 이미 넣은 메뉴 이름 (같은 이름이 두 끼에 나오면 한 번만 넣으려고)

  // 조식 → 중식 → 석식 순서로 돈다
  for (const code of MEAL_CODES) {
    const menus = menusOf(meals, code);
    // 이 끼니에 메뉴가 없으면(불러오는 중/실패) 건너뛴다
    // [문법] continue: 반복문의 "이번 차례"만 건너뛰고 다음 차례로 넘어간다
    if (!menus) continue;

    // 이 끼니의 메뉴를 하나씩 본다
    for (const menu of menus) {
      // 규칙 1) 평가가 하나도 없으면 빼기
      if (menu.reviewCount === 0) continue;
      // 규칙 2) 이미 넣은 이름이면 빼기
      // [문법] 배열.includes(값): 배열 안에 그 값이 있으면 true
      if (seenNames.includes(menu.name)) continue;
      // 통과! 이름을 기억해 두고...
      seenNames.push(menu.name);
      // ...후보 목록에 넣는다. 원래 메뉴 정보 + 식사 번호(code)를 새 객체로 만들어 담는다
      list.push({
        menuId: menu.menuId,
        name: menu.name,
        averageRating: menu.averageRating,
        reviewCount: menu.reviewCount,
        code: code,
      });
    }
  }

  // 규칙 3) 심판(compareMenus) 기준으로 줄 세우기
  // [문법] 배열.sort(비교함수): 배열 자체의 순서를 바꾼다
  list.sort(compareMenus);
  // 규칙 4) 앞에서 3개만 잘라서 돌려준다 (3개보다 적으면 있는 만큼만)
  // [문법] 배열.slice(0, 3): 0번부터 3번 "앞"까지(= 0, 1, 2번) 잘라 낸 새 배열
  return list.slice(0, 3);
}

// ----------------------------------------------------------------------------
// itemHtml(menu, rank) — TOP 3 목록의 한 줄 HTML
//
//   모양:  [1] 🍗 닭갈비                 ★ 4.5
//   menu: pickTop이 만든 메뉴 객체,  rank: 순위 숫자(1, 2, 3)
// ----------------------------------------------------------------------------
function itemHtml(menu, rank) {
  // [문법] encodeURIComponent(값): 주소(URL)에 넣어도 안전한 글자로 바꾼다
  // [문법] .toFixed(1): 소수 첫째 자리까지 글자로 (4 → '4.0')
  // [HTML] <span class="sr-only">: 화면에는 안 보이고 낭독기만 읽는 글자 → "순위 1", "평균 별점 4.5"
  // [HTML] aria-hidden="true": 낭독기가 읽지 않는 장식 (그림 글자, ★)
  return `
    <li class="today-top__item">
      <span class="today-top__rank"><span class="sr-only">순위 </span>${rank}</span>
      <span class="today-top__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
      <a class="today-top__name" href="/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${menu.code}">${escapeHtml(menu.name)}</a>
      <span class="today-top__score"><span aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${menu.averageRating.toFixed(1)}</strong></span>
    </li>`;
}

// ----------------------------------------------------------------------------
// renderTodayTop(container, meals) — TOP 3 상자를 그린다 (main.js가 부르는 함수)
//
//   상황별로 보여 주는 것:
//     세 끼 모두 불러오기 실패 → "메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요."
//     평가가 하나도 없음       → "아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요."
//     그 밖                    → 1, 2, 3위 목록
// ----------------------------------------------------------------------------
// [문법] export: main.js가 import 해서 부를 수 있게 내보낸다
export function renderTodayTop(container, meals) {
  // ── 1) 메뉴를 불러온 끼니가 하나라도 있는지 확인 ──
  // 처음엔 false(없음)로 두고, 하나라도 찾으면 true로 바꾼다 (깃발 세우기 방식)
  let loadedAny = false;
  for (const code of MEAL_CODES) {
    if (menusOf(meals, code)) loadedAny = true;
  }
  if (!loadedAny) {
    // 세 끼 모두 못 불러왔는데 "평가가 없다"고 하면 거짓말이 된다. 그래서 다른 문구를 보여 준다
    // (해결은 위쪽 오류 안내의 "다시 시도" 버튼으로)
    container.innerHTML = '<p class="today-top__empty">메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요.</p>';
    return;
  }

  // ── 2) TOP 3 고르기 ──
  const list = pickTop(meals);
  // 고를 게 하나도 없으면(평가가 0개) 안내 문구
  if (list.length === 0) {
    container.innerHTML = '<p class="today-top__empty">아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요.</p>';
    return;
  }

  // ── 3) 한 줄씩 HTML을 만들어 이어 붙이고, 상자에 넣는다 ──
  let items = '';
  // [문법] 배열의 칸 번호(i)는 0부터 시작한다. 화면에 보이는 순위는 1부터니까 i + 1
  for (let i = 0; i < list.length; i += 1) {
    items += itemHtml(list[i], i + 1);
  }
  // [HTML] <ol>: 번호가 있는 목록 (순위는 순서가 중요해서 ol)
  container.innerHTML = `<ol class="today-top__list">${items}</ol>`;
}
