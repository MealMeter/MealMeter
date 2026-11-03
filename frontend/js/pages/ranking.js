// 역할: 인기 순위 페이지 동작 — getRanking()으로 순위를 불러와 보여 준다 (명세서 3장 기능 3). 담당: 조현우
// 정렬은 서버가 해서 보내 준다 (평균 별점 높은 순, 메뉴 이름 기준으로 합침). 화면은 받은 순서대로 그린다.
// 넓은 화면은 표, 좁은 화면(760px 미만)은 목록으로 보여 준다. 둘 다 그려 두고 CSS로 하나만 보이게 한다
// (display:none인 쪽은 화면 낭독기도 읽지 않는다).
// TODO(팀 회의): 평가가 1~2개뿐인 메뉴 처리 방식이 정해지면 "평가 부족" 표시 등을 여기에 추가한다.
// [문법] import { 이름 } from '경로': 다른 파일에서 내보낸 함수·값을 가져온다
import { getRanking } from '../api/index.js';
import { HYGIENE_FIELD } from '../api/reviewFields.js';
import { escapeHtml } from '../common/format.js';
import { loadData, renderEmpty } from '../common/state.js';
import { linkButtonHtml, tagBadgeHtml } from '../common/ui.js';

// [문법] document.getElementById('아이디'): HTML에서 id="아이디"인 요소 하나를 찾는다
const contentBox = document.getElementById('ranking-content');

// 많이 고른 태그 배지들. 위생 태그(문제 있음)는 경고 배지로 보여 준다
// [문법] item: 서버가 준 순위 한 줄 { rank, name, averageRating, reviewCount, topTags }
function tagsHtml(item) {
  // [문법] if (조건) return 값;: 조건이 맞으면 바로 값을 돌려주고 함수를 끝낸다(중괄호 생략)
  if (item.topTags.length === 0) return '<span class="ranking-page__none">태그 없음</span>';
  // [문법] ${item.topTags ... .join('')}: 템플릿 안에 배열 → map → join 결과(글자)를 넣는다. 줄이 길어 여러 줄에 나눠 썼다
  // [문법] tag.category === HYGIENE_FIELD.label: 위생 태그일 때만 true → 경고 배지(세 번째 인자)
  return `<ul class="ranking-page__tags" aria-label="가장 많이 선택된 태그">${item.topTags
    .map((tag) => `<li>${tagBadgeHtml(tag.category, tag.value, tag.category === HYGIENE_FIELD.label)}</li>`)
    .join('')}</ul>`;
}

// 순위 동그라미. 1~3위는 꽉 찬 색으로 강조한다 (숫자가 함께 있어서 색만으로 구분하지 않는다)
// [문법] 삼항 연산자 조건 ? A : B 로 1~3위면 ' is-top' 클래스를 더 붙인다
function rankHtml(item) {
  return `<span class="ranking-page__rank${item.rank <= 3 ? ' is-top' : ''}"><span class="sr-only">순위 </span>${item.rank}</span>`;
}

// "★ 4.5" 평균 별점 (낭독기는 "평균 별점 4.5"로 읽는다)
function scoreHtml(item) {
  return `<span class="ranking-page__star" aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${item.averageRating.toFixed(1)}</strong>`;
}

// 넓은 화면: 표의 한 줄. th scope="row": 이 줄의 제목은 메뉴 이름이라고 화면 낭독기에 알려 준다
// [문법] <tr>: 표의 한 줄, <td>: 칸, <th scope="row">: 이 줄의 제목 칸
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
// [문법] <li>: 목록 항목 하나. 좁은 화면에서는 표 대신 이 목록이 보인다(CSS가 결정)
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

// 받은 순위를 그린다. 순위가 하나도 없으면 빈 화면 + "평가하러 가기" 버튼
// [문법] items: 서버가 준 순위 배열
function render(items) {
  if (items.length === 0) {
    // [문법] renderEmpty(상자, 메시지, 추가HTML): state.js의 빈 화면 함수. 인자를 여러 줄에 나눠 쓰고 끝에 쉼표(trailing comma)를 둘 수 있다
    renderEmpty(
      contentBox,
      '아직 순위가 없어요',
      `<p class="small">평가가 하나도 쌓이지 않아서 순위를 매길 수 없어요. 오늘의 메뉴를 먼저 평가해 볼까요?</p>
       ${linkButtonHtml('/', '오늘의 메뉴 평가하러 가기')}`,
    );
    return;
  }

  // [문법] <table>: 표. <caption>: 표 제목(sr-only라 낭독기만 읽음). <thead>/<tbody>: 머리 줄/본문 줄 묶음
  // [문법] <th scope="col">: 이 칸이 '열 제목'이라고 알려 준다
  // [문법] <ol>: 순서 있는 목록(순위라서 ol). aria-label: 목록 이름을 낭독기에 알려 준다
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

// 페이지를 열면: 불러오는 중 표시 → 서버에서 순위 받기 → render로 그리기 (실패하면 오류 + 다시 시도)
// [문법] 파일이 실행되면 바로 이 줄이 돈다. () => getRanking(): 나중에 부를 함수를 넘긴다(바로 부르지 않음)
// [문법] render: 함수 이름만 넘기면 loadData가 데이터를 받은 뒤 render(데이터)로 불러 준다(콜백)
loadData(contentBox, () => getRanking(), render, '순위를 불러오는 중이에요');
