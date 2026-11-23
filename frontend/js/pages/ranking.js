// ============================================================================
// 📄 ranking.js — 인기 순위 페이지 (ranking.html) 동작  (명세서 3장 기능 3)       담당: 조현우
// ============================================================================
//
// 🏆 하는 일
//   서버에서 인기 순위를 받아 와 표로 보여 준다. 정렬은 서버가 이미 해서 보내 주므로
//   (평균 별점 높은 순, 같은 이름의 메뉴는 날짜가 달라도 하나로 합침) 화면은 받은 순서대로 그리기만 한다.
//
// 🔄 페이지를 열면 일어나는 일
//   "순위를 불러오는 중이에요" 표시 → getRanking()으로 서버에서 받기
//     → 성공: render(순위목록)으로 그리기
//     → 실패: 오류 문구 + [다시 시도] 버튼   (이 흐름은 state.js의 loadData가 알아서 해 준다)
//
// 📱 화면 크기에 따라 모양이 다르다
//   넓은 화면(컴퓨터)      → 표(table)
//   좁은 화면(760px 미만) → 카드 목록(ol)
//   두 모양을 "둘 다" 그려 두고, CSS가 화면 크기를 보고 하나만 보이게 한다.
//   (CSS로 숨긴 쪽(display:none)은 낭독기도 읽지 않아서 내용이 두 번 읽히지 않는다)
//
// 📝 TODO(팀 회의): 평가가 1~2개뿐인 메뉴 처리 방식이 정해지면 "평가 부족" 표시 등을 여기에 추가한다.
// ============================================================================

// [문법] import { 이름 } from '경로': 다른 파일에서 내보낸 함수·값을 가져온다
import { getRanking } from '../api/index.js'; // 서버에서 순위 가져오기
import { HYGIENE_FIELD } from '../api/reviewFields.js'; // 위생 태그 정보 (경고 배지 판단용)
import { escapeHtml } from '../common/format.js'; // 메뉴 이름을 안전하게 HTML에 넣기
import { loadData, renderEmpty } from '../common/state.js'; // 불러오기 자동 처리, 빈 화면
import { linkButtonHtml, tagBadgeHtml } from '../common/ui.js'; // 버튼 모양 링크, 태그 배지

// 순위를 그려 넣을 상자 (ranking.html의 <div id="ranking-content">)
// [문법] document.getElementById('아이디'): HTML에서 id="아이디"인 요소 하나를 찾는다
const contentBox = document.getElementById('ranking-content');

// 💡 아래 함수들이 받는 item = 서버가 준 순위 한 줄
//    { rank: 1, name: '닭갈비', averageRating: 4.5, reviewCount: 3,
//      topTags: [ { category: '간', value: '짜다' }, { category: '위생', value: '문제 있음' } ] }

// ----------------------------------------------------------------------------
// tagsHtml(item) — 그 메뉴에서 가장 많이 고른 태그들을 배지로
//
//   예) [간 · 짜다] [! 위생 문제 있음]
//   태그가 없으면 '태그 없음' 글자. 위생 태그는 눈에 띄는 경고 배지로 보여 준다.
// ----------------------------------------------------------------------------
function tagsHtml(item) {
  // 태그가 하나도 없으면 안내 글자
  if (item.topTags.length === 0) {
    return '<span class="ranking-page__none">태그 없음</span>';
  }
  // 태그마다 <li>배지</li>를 만들어 이어 붙인다
  let badges = '';
  for (const tag of item.topTags) {
    // 항목 이름이 '위생'이면 true → tagBadgeHtml의 세 번째 값(경고 배지)으로 넘긴다
    const isHygiene = tag.category === HYGIENE_FIELD.label;
    badges += `<li>${tagBadgeHtml(tag.category, tag.value, isHygiene)}</li>`;
  }
  // aria-label: 낭독기가 이 목록을 "가장 많이 선택된 태그"라고 소개해 준다
  return `<ul class="ranking-page__tags" aria-label="가장 많이 선택된 태그">${badges}</ul>`;
}

// ----------------------------------------------------------------------------
// rankHtml(item) — 순위 동그라미 (①②③...)
//
//   1~3위는 꽉 찬 색으로 강조한다(is-top 클래스).
//   숫자가 같이 있어서 색만으로 구분하지 않는다 (색을 못 보는 사람도 순위를 알 수 있게)
// ----------------------------------------------------------------------------
function rankHtml(item) {
  // 1~3위일 때만 ' is-top' 클래스를 덧붙인다 (앞의 공백은 클래스 이름 사이 띄어쓰기)
  let topClass = '';
  if (item.rank <= 3) {
    topClass = ' is-top';
  }
  // 낭독기는 "순위 1"이라고 읽는다 (sr-only = 화면엔 안 보이고 낭독기만 읽는 글자)
  return `<span class="ranking-page__rank${topClass}"><span class="sr-only">순위 </span>${item.rank}</span>`;
}

// ----------------------------------------------------------------------------
// scoreHtml(item) — "★ 4.5" 평균 별점
//   화면에는 "★ 4.5", 낭독기는 "평균 별점 4.5"로 읽는다 (★는 aria-hidden으로 숨김)
// ----------------------------------------------------------------------------
function scoreHtml(item) {
  return `<span class="ranking-page__star" aria-hidden="true">★</span> <span class="sr-only">평균 별점 </span><strong>${item.averageRating.toFixed(1)}</strong>`;
}

// ----------------------------------------------------------------------------
// rowHtml(item) — 넓은 화면용: 표의 한 줄
//
//   | 순위 | 메뉴 이름 | 평균 별점 | 평가 수 | 가장 많이 선택된 태그 |
//
// [HTML] <tr>: 표의 한 줄, <td>: 칸 하나
// [HTML] <th scope="row">: 이 줄의 "제목 칸"이라는 뜻. 낭독기가 칸을 읽을 때 "닭갈비, 평가 수 3개"처럼 이어서 읽어 준다
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// cardHtml(item) — 좁은 화면용: 카드 목록의 한 칸
//
//   ┌────────────────────────┐
//   │ ①  닭갈비               │
//   │     ★ 4.5 · 평가 3개    │
//   │     [간 · 짜다]         │
//   └────────────────────────┘
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// render(items) — 받은 순위 목록을 화면에 그린다 (loadData가 성공하면 불러 준다)
//
//   items: 서버가 준 순위 배열
//   순위가 하나도 없으면 → 빈 화면 + "오늘의 메뉴 평가하러 가기" 버튼
// ----------------------------------------------------------------------------
function render(items) {
  // ── 순위가 없을 때 ──
  if (items.length === 0) {
    // 빈 화면 아래에 붙일 설명 + 버튼 HTML
    const extra = `<p class="small">평가가 하나도 쌓이지 않아서 순위를 매길 수 없어요. 오늘의 메뉴를 먼저 평가해 볼까요?</p>
       ${linkButtonHtml('/', '오늘의 메뉴 평가하러 가기')}`;
    renderEmpty(contentBox, '아직 순위가 없어요', extra);
    return; // 여기서 끝
  }

  // ── 순위가 있을 때 ──
  // 표의 줄들(rows)과 카드들(cards)을 반복문 한 번으로 같이 만든다
  let rows = '';
  let cards = '';
  for (const item of items) {
    rows += rowHtml(item);
    cards += cardHtml(item);
  }

  // 표 + 카드 목록을 상자에 통째로 넣는다 (CSS가 화면 크기에 맞는 쪽만 보여 준다)
  // [HTML] <table>: 표.  <caption>: 표 제목(sr-only라 낭독기만 읽음)
  // [HTML] <thead>: 맨 위 제목 줄 묶음,  <tbody>: 내용 줄 묶음
  // [HTML] <th scope="col">: 이 칸이 "세로줄(열)의 제목"이라는 뜻
  // [HTML] <ol>: 번호 있는 목록(순위라서 ol). aria-label: 목록 이름을 낭독기에 알려 준다
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
        <tbody>${rows}</tbody>
      </table>
    </div>
    <ol class="ranking-list" aria-label="메뉴 인기 순위, 평균 별점 높은 순">${cards}</ol>`;
}

// ============================================================================
// ▶ 시작! 파일이 실행되면 바로 이 줄이 돈다
// ============================================================================
// "불러오는 중 표시 → getRanking() → 성공하면 render(결과) / 실패하면 오류 + 다시 시도"를 loadData가 다 해 준다
// [문법] getRanking, render 처럼 괄호 없이 함수 이름만 넘긴다.
//        괄호를 붙이면(getRanking()) "지금 당장 실행"이 되어 버린다. 우리는 loadData가 알맞은 때에 실행해 주길 원한다(콜백)
loadData(contentBox, getRanking, render, '순위를 불러오는 중이에요');
