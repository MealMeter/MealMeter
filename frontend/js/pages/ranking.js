// 역할: 인기 순위 페이지 동작 — getRanking()으로 순위를 불러와 보여 준다 (명세서 3장 기능 3). 담당: 조현우
// 정렬은 서버가 해서 보내 준다 (평균 별점 높은 순, 메뉴 이름 기준으로 합침). 화면은 받은 순서대로 그린다.
// 넓은 화면은 표, 좁은 화면(760px 미만)은 목록으로 보여 준다. 둘 다 그려 두고 CSS로 하나만 보이게 한다
// (display:none인 쪽은 화면 낭독기도 읽지 않는다).
// TODO(팀 회의): 평가가 1~2개뿐인 메뉴 처리 방식이 정해지면 "평가 부족" 표시 등을 여기에 추가한다.
import { getRanking } from '../api/index.js';
import { HYGIENE_FIELD } from '../api/reviewFields.js';
import { escapeHtml } from '../common/format.js';
import { loadData, renderEmpty } from '../common/state.js';
import { linkButtonHtml, tagBadgeHtml } from '../common/ui.js';

const contentBox = document.getElementById('ranking-content');

// 많이 고른 태그 배지들. 위생 태그(문제 있음)는 경고 배지로 보여 준다
function tagsHtml(item) {
  if (item.topTags.length === 0) return '<span class="ranking-page__none">태그 없음</span>';
  return `<ul class="ranking-page__tags" aria-label="가장 많이 선택된 태그">${item.topTags
    .map((tag) => `<li>${tagBadgeHtml(tag.category, tag.value, tag.category === HYGIENE_FIELD.label)}</li>`)
    .join('')}</ul>`;
}

// 순위 동그라미. 1~3위는 꽉 찬 색으로 강조한다 (숫자가 함께 있어서 색만으로 구분하지 않는다)
function rankHtml(item) {
  return `<span class="ranking-page__rank${item.rank <= 3 ? ' is-top' : ''}"><span class="sr-only">순위 </span>${item.rank}</span>`;
}

function scoreHtml(item) {
  return `<span class="ranking-page__star" aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${item.averageRating.toFixed(1)}</strong>`;
}

// 넓은 화면: 표의 한 줄. th scope="row": 이 줄의 제목은 메뉴 이름이라고 화면 낭독기에 알려 준다
function rowHtml(item) {
  return `
    <tr>
      <td>${rankHtml(item)}</td>
      <th scope="row" class="ranking-table__name">${escapeHtml(item.name)}</th>
      <td class="ranking-table__nowrap">${scoreHtml(item)}</td>
      <td class="ranking-table__nowrap ranking-page__count">${item.reviewCount}개</td>
      <td>${tagsHtml(item)}</td>
    </tr>`;
}

// 좁은 화면: 목록의 한 칸
function cardHtml(item) {
  return `
    <li class="ranking-list__item">
      ${rankHtml(item)}
      <div class="ranking-list__body">
        <p class="ranking-list__name">${escapeHtml(item.name)}</p>
        <p class="ranking-page__count">${scoreHtml(item)} · 평가 ${item.reviewCount}개</p>
        ${tagsHtml(item)}
      </div>
    </li>`;
}

function render(items) {
  if (items.length === 0) {
    renderEmpty(
      contentBox,
      '아직 순위가 없어요',
      `<p class="small">평가가 하나도 쌓이지 않아서 순위를 매길 수 없어요. 오늘의 메뉴를 먼저 평가해 볼까요?</p>
       ${linkButtonHtml('/', '오늘의 메뉴 평가하러 가기')}`,
    );
    return;
  }

  contentBox.innerHTML = `
    <div class="ranking-table__wrap">
      <table class="ranking-table">
        <caption class="sr-only">메뉴 인기 순위, 평균 별점 높은 순</caption>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">메뉴 이름</th>
            <th scope="col">평균 별점</th>
            <th scope="col">평가 수</th>
            <th scope="col">가장 많이 선택된 태그</th>
          </tr>
        </thead>
        <tbody>${items.map(rowHtml).join('')}</tbody>
      </table>
    </div>
    <ol class="ranking-list" aria-label="메뉴 인기 순위, 평균 별점 높은 순">${items.map(cardHtml).join('')}</ol>`;
}

loadData(contentBox, () => getRanking(), render, '순위를 불러오는 중이에요');
