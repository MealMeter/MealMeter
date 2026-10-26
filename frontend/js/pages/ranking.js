// 역할: 인기 순위 페이지 동작 — getRanking()으로 순위를 불러와 표로 보여 준다 (명세서 3장 기능 3). 담당: 조현우
// 정렬은 서버가 해서 보내 준다 (평균 별점 높은 순, 메뉴 이름 기준으로 합침). 화면은 받은 순서대로 그린다.
// TODO(팀 회의): 평가가 1~2개뿐인 메뉴 처리 방식이 정해지면 "평가 부족" 표시 등을 여기에 추가한다.
import { getRanking } from '../api/index.js';
import { HYGIENE_FIELD } from '../api/reviewFields.js';
import { escapeHtml } from '../common/format.js';
import { loadData, renderEmpty } from '../common/state.js';
import { linkButtonHtml, starRatingHtml, tagBadgeHtml } from '../common/ui.js';

const contentBox = document.getElementById('ranking-content');

// 표의 한 줄. item = { rank, name, averageRating, reviewCount, topTags: [{ category, value }] }
function rowHtml(item) {
  // 위생 태그(문제 있음)는 경고 배지로 보여 준다
  const tags = item.topTags.length
    ? `<ul class="ranking-table__tags">${item.topTags
      .map((tag) => `<li>${tagBadgeHtml(tag.category, tag.value, tag.category === HYGIENE_FIELD.label)}</li>`)
      .join('')}</ul>`
    : '<span class="muted small">없음</span>';

  // 1~3위는 굵게 강조 (색만이 아니라 "위" 글자와 굵기로도 구분)
  const top = item.rank <= 3 ? ' is-top' : '';

  // th scope="row": 이 줄의 제목은 메뉴 이름이라고 화면 낭독기에 알려 준다
  return `
    <tr>
      <td class="ranking-table__rank${top}">${item.rank}위</td>
      <th scope="row" class="ranking-table__name">${escapeHtml(item.name)}</th>
      <td>${starRatingHtml(item.averageRating)}</td>
      <td>${item.reviewCount}개</td>
      <td>${tags}</td>
    </tr>`;
}

function render(items) {
  if (items.length === 0) {
    renderEmpty(contentBox, '아직 순위를 낼 평가가 없어요', linkButtonHtml('/', '오늘의 메뉴 평가하러 가기'));
    return;
  }

  // 화면이 좁으면 표만 옆으로 밀어서 볼 수 있게 감싼다.
  // tabindex="0" + role="region": 키보드로도 이 상자에 들어와서 화살표로 옆으로 밀 수 있다
  contentBox.innerHTML = `
    <div class="ranking-table__wrap" role="region" aria-label="인기 순위 표" tabindex="0">
      <table class="ranking-table">
        <caption class="sr-only">평균 별점 높은 순 메뉴 순위</caption>
        <thead>
          <tr>
            <th scope="col">순위</th>
            <th scope="col">메뉴</th>
            <th scope="col">평균 별점</th>
            <th scope="col">평가 수</th>
            <th scope="col">많이 고른 태그</th>
          </tr>
        </thead>
        <tbody>${items.map(rowHtml).join('')}</tbody>
      </table>
    </div>`;
}

loadData(contentBox, () => getRanking(), render, '순위를 불러오는 중이에요');
