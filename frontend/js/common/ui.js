// 역할: 공통 UI 부품을 HTML 글자로 만들어 주는 함수 모음 (별점 표시, 태그 배지, 링크 버튼, 메뉴 그림 글자). 담당: 김근영
// 스타일은 css/base.css의 "3) 공통 UI 부품"에 있다. 카드는 함수 없이 class="card"만 붙이면 된다.
//
// starRatingHtml(4.2)                       → ★★★★☆ 4.2
// starRatingHtml(5, { showValue: false })   → ★★★★★
// tagBadgeHtml('간', '적당')                → [간 · 적당]
// tagBadgeHtml('위생', '문제 있음', true)   → 눈에 띄는 경고 배지
// linkButtonHtml('/', '홈으로')             → 버튼 모양 링크 (variant: 'primary' | 'secondary' | 'danger')
// dishIcon('소고기무국')                    → '🍲' (메뉴 이름으로 고른 장식용 그림 글자)
import { escapeHtml } from './format.js';

// 읽기 전용 별점 표시. value는 0~5 숫자 (4.2처럼 소수도 된다)
export function starRatingHtml(value = 0, { showValue = true } = {}) {
  const score = Math.min(5, Math.max(0, Number(value) || 0)); // 0~5 사이로 맞춘다
  const filled = Math.round(score); // 4.2 → 별 4개

  let stars = '';
  for (let i = 0; i < 5; i += 1) {
    stars += i < filled
      ? '<span class="star-rating__star is-filled">★</span>'
      : '<span class="star-rating__star">☆</span>';
  }

  // role="img" + aria-label: 화면 낭독기는 별 5개를 하나하나 읽지 않고 "5점 만점에 4.2점"이라고 읽는다
  return `
    <span class="star-rating" role="img" aria-label="5점 만점에 ${score.toFixed(1)}점">
      <span class="star-rating__stars" aria-hidden="true">${stars}</span>
      ${showValue ? `<strong class="star-rating__value" aria-hidden="true">${score.toFixed(1)}</strong>` : ''}
    </span>`;
}

// 색만으로 구분하지 않도록 항목 이름과 값을 글자로 함께 보여 준다
export function tagBadgeHtml(category, value, warning = false) {
  if (warning) {
    return `<span class="tag-badge tag-badge--warning"><span aria-hidden="true">!</span>${escapeHtml(category)} ${escapeHtml(value)}</span>`;
  }
  return `<span class="tag-badge">${escapeHtml(category)} · ${escapeHtml(value)}</span>`;
}

// 링크(<a>)인데 모양은 버튼. ariaLabel: 같은 글자 버튼이 여러 개일 때 구분용 (예: "닭갈비 평가하기")
export function linkButtonHtml(href, label, { variant = 'primary', ariaLabel } = {}) {
  const aria = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  return `<a class="btn btn--${variant}" href="${escapeHtml(href)}"${aria}>${escapeHtml(label)}</a>`;
}

// 메뉴 이름을 보고 장식용 그림 글자를 고른다. 화면 낭독기에는 읽히지 않게 aria-hidden 자리에 쓴다.
// 위에서부터 먼저 맞는 것을 쓴다 (예: "딸기요구르트"는 음료가 디저트보다 먼저)
const DISH_ICONS = [
  [/우유|주스|요구르트|요거트|에이드|음료|라떼/, '🥛'],
  [/푸딩|케이크|과일|사과|배$|귤|수박|딸기|바나나|아이스|빵|쿠키|브레드|떡$/, '🍮'],
  [/김치|깍두기|섞박지|단무지|피클/, '🥬'],
  [/국$|탕$|찌개|국밥|스프|수프/, '🍲'],
  [/면|국수|우동|짜장|짬뽕|파스타|스파게티/, '🍜'],
  [/밥|라이스|덮밥|죽/, '🍚'],
  [/샐러드|나물|무침|쌈/, '🥗'],
  [/까스|가스|튀김|너겟|가라아게|강정|치킨|전$/, '🍗'],
  [/볶음|구이|불고기|갈비|제육|고기|스테이크|조림|찜/, '🍖'],
];

// 위 목록에서 이름이 처음 맞는 그림을 돌려준다. 하나도 안 맞으면 기본 접시 🍽️
export function dishIcon(name) {
  return DISH_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? '🍽️';
}
