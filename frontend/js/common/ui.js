// 역할: 공통 UI 부품을 HTML 글자로 만들어 주는 함수 모음 (별점 표시, 태그 배지, 링크 버튼). 담당: 김태건
// 스타일은 css/base.css의 "3) 공통 UI 부품"에 있다. 카드는 함수 없이 class="card"만 붙이면 된다.
//
// starRatingHtml(4.2)                       → ★★★★☆ 4.2
// starRatingHtml(5, { showValue: false })   → ★★★★★
// tagBadgeHtml('간', '적당')                → [간 · 적당]
// tagBadgeHtml('위생', '문제 있음', true)   → 눈에 띄는 경고 배지
// linkButtonHtml('/', '홈으로')             → 버튼 모양 링크 (variant: 'primary' | 'secondary' | 'danger')
import { escapeHtml } from './format.js';

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
