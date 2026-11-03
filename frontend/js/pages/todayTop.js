// 역할: 메인 페이지 아래쪽 "오늘 인기 TOP 3" 상자를 그린다. 담당: 김태건
// 메인 페이지(main.js)가 메뉴를 불러온 뒤 이 함수를 부른다.
//
// renderTodayTop(상자, meals) → 상자 안에 TOP 3 목록(또는 안내 문구)을 그린다
//   meals 모양: { 1: { menus: [...] } 또는 { error: '메시지' }, 2: …, 3: … }  (main.js가 가진 값 그대로)
// [문법] import { 이름 } from '경로': 다른 파일이 export한 값을 가져온다. '../'는 한 단계 위 폴더
import { MEAL_TYPES } from '../api/reviewFields.js';
import { escapeHtml } from '../common/format.js';
import { dishIcon } from '../common/ui.js';

// 식사 코드 목록 [1, 2, 3] (조식·중식·석식)
// [문법] Object.keys(객체): 객체의 키들을 배열로 → ['1', '2', '3'] (문자열)
// [문법] .map(Number): 각각 숫자로 → [1, 2, 3]
const MEAL_CODES = Object.keys(MEAL_TYPES).map(Number);

// 세 끼를 모두 모아 평가가 있는 메뉴만, 평균 별점 → 평가 수 순서로 3개 고른다
// [문법] function 이름(매개변수) { }: 함수 선언. export가 없으니 이 파일 안에서만 쓴다
function pickTop(meals) {
  // [문법] new Set(): 중복 없이 값을 모아 두는 집합. has(값)로 있는지 확인, add(값)로 추가
  const seen = new Set(); // 이미 넣은 메뉴 이름 (같은 이름이 두 끼에 나오면 한 번만 넣는다)
  // [문법] return 배열.flatMap(...).filter(...).sort(...).slice(...): 메서드를 줄줄이 이어 부르는 '메서드 체이닝'
  // [문법] 한 줄 끝마다 결과(새 배열)가 다음 메서드로 넘어간다. 줄 사이 // 주석은 실행에 영향이 없다
  return MEAL_CODES
    // 끼니마다 메뉴를 꺼내고, 상세 페이지 링크에 쓸 식사 코드(code)를 붙인다
    // [문법] 배열.flatMap(함수): 함수가 돌려준 배열들을 한 겹 펼쳐 하나의 배열로 합친다 (map + flat)
    // [문법] meals[code]?.menus ?? []: 옵셔널 체이닝(?.)으로 meals[code]가 없어도 오류 없이 undefined → ?? 로 빈 배열 대신
    // [문법] ({ ...menu, code }): 객체 펼침(...)으로 menu의 속성을 복사하고 code 속성을 더한 새 객체. 화살표 함수에서 객체를 바로 돌려줄 땐 괄호 ( )로 감싼다
    // [문법] { code }는 { code: code }의 줄임(단축 속성)
    .flatMap((code) => (meals[code]?.menus ?? []).map((menu) => ({ ...menu, code })))
    // 평가가 하나도 없는 메뉴와 이름이 겹치는 메뉴는 뺀다
    // [문법] 배열.filter(함수): 함수가 true를 돌려준 요소만 남긴 새 배열
    // [문법] A && B && C: 모두 참이어야 참. 앞이 거짓이면 뒤는 실행하지 않는다(단락 평가)
    // [문법] !seen.has(...): ! 는 참·거짓을 뒤집는다. seen.add(...)는 Set 자신을 돌려줘서(참으로 취급) 추가와 통과를 한 번에 한다
    .filter((menu) => menu.reviewCount > 0 && !seen.has(menu.name) && seen.add(menu.name))
    // 별점이 같으면 평가가 많은 쪽을 위로
    // [문법] 배열.sort((a, b) => 숫자): 비교 함수가 음수면 a가 앞, 양수면 b가 앞. b - a 는 큰 값이 앞(내림차순)
    // [문법] X || Y: 평균 차이가 0(거짓)이면 평가 수 차이로 다시 비교한다
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    // [문법] 배열.slice(시작, 끝): 시작 번호부터 끝 번호 '앞'까지 잘라 새 배열. 0, 1, 2번 = 앞의 3개
    .slice(0, 3);
}

// TOP 3의 한 줄 (순위 숫자, 그림 글자, 메뉴 이름 링크, 평균 별점)
// [문법] map에서 넘겨주는 두 번째 값 index는 0부터 시작하는 순서 번호
function itemHtml(menu, index) {
  // [문법] 백틱(`) 템플릿 리터럴: 여러 줄 HTML을 그대로 쓰고 ${식} 자리에 값을 넣는다
  // [문법] ${index + 1}: 0부터 세는 번호를 1위부터 보이게 1을 더한다
  // [문법] encodeURIComponent(값): 주소(URL)에 넣어도 안전한 글자로 바꾼다(공백·한글 등)
  // [문법] .toFixed(1): 소수 첫째 자리까지 글자로 (4 → '4.0')
  // [문법] <span class="sr-only">: 화면에는 안 보이고 낭독기만 읽는 글자 / aria-hidden="true": 낭독기가 읽지 않는 장식
  return `
    <li class="today-top__item">
      <span class="today-top__rank"><span class="sr-only">순위 </span>${index + 1}</span>
      <span class="today-top__icon" aria-hidden="true">${dishIcon(menu.name)}</span>
      <a class="today-top__name" href="/menu.html?menuId=${encodeURIComponent(menu.menuId)}&meal=${menu.code}">${escapeHtml(menu.name)}</a>
      <span class="today-top__score"><span aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${menu.averageRating.toFixed(1)}</strong></span>
    </li>`;
}

// [문법] export: main.js가 import 해서 부를 수 있게 내보낸다. container는 HTML 요소, meals는 세 끼 데이터
export function renderTodayTop(container, meals) {
  // [문법] 배열.some(함수): 하나라도 true면 true. 앞의 ! 로 뒤집어서 '세 끼 모두 메뉴가 없으면'
  if (!MEAL_CODES.some((code) => meals[code]?.menus)) {
    // 세 끼 모두 불러오지 못했으면 "평가가 없다"고 하지 않는다 (위 오류 안내의 "다시 시도"로 해결)
    // [문법] 요소.innerHTML = 'HTML': 요소 안 내용을 통째로 바꾼다
    container.innerHTML = '<p class="today-top__empty">메뉴를 불러오지 못해서 순위를 보여 줄 수 없어요.</p>';
    return;
  }

  // [문법] 위에서 만든 함수를 불러 결과(배열)를 list에 담는다
  const list = pickTop(meals);
  // [문법] 배열.length: 요소 개수. === 는 값과 자료형이 모두 같은지 비교(엄격한 같음)
  if (list.length === 0) {
    container.innerHTML = '<p class="today-top__empty">아직 오늘 평가가 없어요. 첫 평가를 남겨 보세요.</p>';
    return;
  }
  // [문법] list.map(itemHtml): 함수 이름을 그대로 넘겨 각 메뉴를 <li> 글자로 바꾸고, .join('')으로 이어 붙인다
  container.innerHTML = `<ol class="today-top__list">${list.map(itemHtml).join('')}</ol>`;
}
