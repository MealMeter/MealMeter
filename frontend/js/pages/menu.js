// ============================================================================
// 📄 menu.js — 메뉴 상세 페이지(menu.html) 동작  (명세서 3장 기능 2)            담당: 박준호
// ============================================================================
//
// 📝 이 페이지에서 사용자가 할 수 있는 일
//   1) 메뉴 정보 보기 — 식사 구분(중식), 날짜, 메뉴 이름, 평균 별점, 알레르기
//   2) 평가 남기기    — 별점(필수) + 태그(간·양·온도·식감·위생, 선택) + 의견(선택, 100자까지)
//   3) 평가 목록 보기 — 다른 사람들이 남긴 평가들 (방금 내가 등록한 건 맨 위에 "방금 등록" 표시)
//
// 🔗 주소 모양
//   /menu.html?menuId=3&meal=2
//     menuId = 메뉴 번호 (필수. 없으면 "메뉴 번호가 없어요" 오류)
//     meal   = 식사 번호 1·2·3 (있으면 "중식" 표시. 없어도 동작한다)
//
// 🔄 페이지를 열면 일어나는 일 (맨 아래 start 함수)
//   1) 주소에서 메뉴 번호 꺼내기 (없으면 오류 보여 주고 끝)
//   2) 태그 버튼들 만들기
//   3) 폼 동작(별점 고르기, 태그 누르기, 글자 수 세기, 등록) 연결하기
//   4) 서버에서 메뉴 정보 + 평가 목록 불러오기 → 화면 그리기
//   5) 나이스에서 알레르기 정보 찾아 덧붙이기 (실패해도 평가는 그대로 가능)
//
// ✅ 평가를 등록하면
//   새로고침 없이 → 받은 평가를 목록 맨 위에 넣고 → 평균·개수를 다시 계산하고 → 폼을 비운다
//
// 📦 menu.html에 미리 만들어 둔 것 / 이 파일이 만드는 것
//   별점 라디오 5개, 의견 입력창, 등록 버튼 → menu.html에 이미 있다
//   간·양·온도·식감·위생 태그 버튼        → 이 파일이 reviewFields.js를 보고 만든다 (규칙을 한 곳에서 관리하려고)
// ============================================================================

// [문법] import { 이름들 } from '경로': 다른 파일이 export한 것을 가져온다
import { createReview, getMealInfo, getMenuReviews } from '../api/index.js'; // 평가 등록, 나이스 정보, 평가 목록
import { findDish } from '../api/neis.js'; // 나이스 정보에서 메뉴 찾기
// [문법] 가져올 게 많으면 { } 안을 여러 줄에 나눠 써도 된다
import {
  COMMENT_MAX_LENGTH, HYGIENE_FIELD, HYGIENE_PROBLEM, MEAL_TYPES, RATING_LABELS, TAG_FIELDS,
} from '../api/reviewFields.js'; // 평가 규칙들
import { escapeHtml, formatDate, formatDateTime } from '../common/format.js'; // 안전한 글자, 날짜 글자
import { loadData, renderEmpty, renderError } from '../common/state.js'; // 불러오기 자동 처리, 빈 화면, 오류 화면
import { tagBadgeHtml } from '../common/ui.js'; // 태그 배지

// ---------- HTML에서 쓸 자리 찾아 두기 ----------
// 여러 번 쓰니까 처음에 한 번 찾아서 변수에 담아 둔다
// [문법] document.getElementById('id'): 그 id를 가진 HTML 요소를 찾는다
const stateBox = document.getElementById('menu-state'); // "불러오는 중"/오류를 보여 줄 자리
const content = document.getElementById('menu-content'); // 페이지 본문 (불러오기 전엔 숨겨 둔다)
const form = document.getElementById('review-form'); // 평가 폼 전체
const starInput = document.getElementById('star-input'); // 별점 고르는 칸
const ratingValue = document.getElementById('rating-value'); // "4점 · 좋아요" 글자 자리
const commentInput = document.getElementById('review-comment'); // 의견 입력창
const commentCount = document.getElementById('comment-count'); // "12 / 100자" 글자 자리
const submitButton = document.getElementById('review-submit'); // [평가 등록] 버튼
const formError = document.getElementById('review-form-error'); // 폼 오류 상자 자리
const formSuccess = document.getElementById('review-form-success'); // "✓ 평가가 등록됐어요" 자리
const hygieneHint = document.getElementById('hygiene-hint'); // 위생 "문제 있음"을 고르면 나오는 안내
const listBox = document.getElementById('review-list'); // 평가 목록 자리

// ---------- 주소에서 값 꺼내기 ----------
// 주소가 menu.html?menuId=3&meal=2 이면 → menuId = '3', mealCode = 2
// [문법] window.location.search: 주소에서 ? 뒤 부분('?menuId=3&meal=2')
// [문법] new URLSearchParams(글자): 그 글자를 읽기 쉽게 해 주는 도구.
//        params.get('menuId') → '3' (글자로 나온다. 없으면 null)
const params = new URLSearchParams(window.location.search);
const menuId = params.get('menuId');
// 식사 번호는 올바른 값(1·2·3)일 때만 숫자로 쓰고, 이상하거나 없으면 null
// MEAL_TYPES['2'] → '중식'(있음),  MEAL_TYPES['7'] → undefined,  MEAL_TYPES[null] → undefined
let mealCode = null;
if (MEAL_TYPES[params.get('meal')]) {
  mealCode = Number(params.get('meal'));
}

// ---------- 페이지가 기억하는 값 (상태) ----------
// [문법] let: 나중에 값이 바뀌는 변수. null = "아직 값 없음"을 직접 표시하는 값
let menu = null; // 서버에서 받은 메뉴 정보 + 평가 목록 { menuId, name, date, averageRating, reviewCount, reviews }
let newReviewId = null; // 방금 등록한 평가의 번호 (목록에서 "방금 등록"으로 강조하려고)
let submitting = false; // 지금 서버에 보내는 중인지 (보내는 중에 또 누르면 두 번 등록되니까 막는다)

// 지금 고른 태그들. 처음에는 모두 null(안 고름)
//   모양: { saltiness: null, portion: '많다', temperature: null, texture: null, hygiene: null }
//   태그 버튼을 누르면 여기 값이 바뀌고, 등록할 때 이 값들을 서버로 보낸다
// [문법] const 객체라도 안의 값은 바꿀 수 있다. tags.portion = '많다' (O)  /  tags = {...} (X, 통째로 새로 넣기는 불가)
const tags = {};

// ----------------------------------------------------------------------------
// clearTags() — 태그를 전부 "안 고름"(null)으로 되돌린다
//   결과: { saltiness: null, portion: null, temperature: null, texture: null, hygiene: null }
// ----------------------------------------------------------------------------
function clearTags() {
  // 간·양·온도·식감
  for (const field of TAG_FIELDS) {
    // [문법] tags[field.key]: 대괄호 안 변수 값('saltiness' 등)을 이름표로 써서 값을 넣는다
    //        tags['saltiness'] = null 은 tags.saltiness = null 과 같다
    tags[field.key] = null;
  }
  // 위생
  tags[HYGIENE_FIELD.key] = null;
}

// ----------------------------------------------------------------------------
// hygieneText(option) — 위생 버튼에 보일 글자
//   서버 값 '없음'은 무엇이 없다는 건지 헷갈리니까 화면에서는 '문제 없음'으로 보여 준다.
//   (서버로 보내는 값은 그대로 '없음')
//   예) hygieneText('없음') → '문제 없음',  hygieneText('문제 있음') → '문제 있음'
// ----------------------------------------------------------------------------
function hygieneText(option) {
  if (option === '없음') return '문제 없음';
  return option;
}

// ============================================================================
// 🏷️ 태그 선택 버튼 만들기
// ============================================================================
// 화면 모양:
//   간    [✓ 짜다] [ 적당 ] [ 싱겁다 ]      ← 하나만 고를 수 있고, 다시 누르면 선택 해제
//   양    [ 많다 ] [ 적당 ] [ 적다 ]
//   ...
//   위생  [ 문제 없음 ] [ 문제 있음 ]

// ----------------------------------------------------------------------------
// optionButtonHtml(option, text) — 태그 버튼 하나
//
//   option: 서버로 보낼 값.   예) '없음'
//   text  : 화면에 보일 글자. 예) '문제 없음'   (보통은 option과 같다)
// ----------------------------------------------------------------------------
function optionButtonHtml(option, text) {
  // [HTML] type="button": ⚠️ form 안의 버튼은 기본이 "제출"이다! 이걸 안 쓰면 태그만 눌러도 평가가 등록돼 버린다
  // [HTML] aria-pressed="false": 켜고 끄는 버튼이라고 알려 준다. 낭독기가 "눌림 / 안 눌림"을 읽어 준다
  //        (CSS도 이 값을 보고 ✓ 표시와 색을 바꾼다)
  // [HTML] data-value: 버튼이 가진 값을 적어 둔다 → 누르면 dataset.value로 읽는다
  return `
    <button type="button" class="tag-selector__option" aria-pressed="false" data-value="${escapeHtml(option)}">
      <span class="tag-selector__check" aria-hidden="true">✓</span>${escapeHtml(text)}
    </button>`;
}

// ----------------------------------------------------------------------------
// tagSelectorHtml(field) — 항목 하나(예: 간)의 버튼 묶음
//
//   field: reviewFields.js의 TAG_FIELDS 한 칸. 예) { key: 'saltiness', label: '간', options: ['짜다','적당','싱겁다'] }
//
//   [HTML] <fieldset>: 관련된 입력들을 묶는 상자,  <legend>: 그 묶음의 이름 (낭독기가 "간, 그룹"처럼 읽음)
//   💡 legend는 낭독기용으로 숨겨 두고(sr-only), 화면에는 왼쪽에 짧은 이름(span)을 따로 보여 준다.
//      (legend는 CSS로 줄 배치하기가 까다로워서)
//   [HTML] data-key: 이 묶음이 어느 항목인지 적어 둔다 → 버튼을 누르면 이걸 보고 tags의 어느 칸을 바꿀지 안다
// ----------------------------------------------------------------------------
function tagSelectorHtml(field) {
  // 고를 수 있는 값마다 버튼을 하나씩 만든다
  let buttons = '';
  for (const option of field.options) {
    buttons += optionButtonHtml(option, option);
  }
  return `
    <fieldset class="tag-selector" data-key="${field.key}">
      <legend class="sr-only">${escapeHtml(field.label)}</legend>
      <span class="tag-selector__label" aria-hidden="true">${escapeHtml(field.label)}</span>
      <div class="tag-selector__options">${buttons}</div>
    </fieldset>`;
}

// ----------------------------------------------------------------------------
// buildTagSelectors() — 태그 버튼들을 화면에 만든다 (페이지 열 때 한 번)
//
//   간·양·온도·식감 → menu.html의 <div id="tag-groups"> 안에 새로 만든다
//   위생             → menu.html에 이미 있는 <fieldset id="hygiene-group"> 안에 버튼만 넣는다
//                      (위생은 경고 안내 문구 등 모양이 달라서 HTML에 틀을 미리 만들어 뒀다)
// ----------------------------------------------------------------------------
function buildTagSelectors() {
  // ── 간·양·온도·식감 ──
  let groups = '';
  for (const field of TAG_FIELDS) {
    groups += tagSelectorHtml(field);
  }
  document.getElementById('tag-groups').innerHTML = groups;

  // ── 위생 ──
  const hygiene = document.getElementById('hygiene-group');
  // 다른 묶음과 똑같이 data-key와 클래스를 붙여 준다 → 아래 클릭 처리·눌림 표시 코드를 그대로 같이 쓸 수 있다
  // [문법] 요소.dataset.key = 값: HTML 속성 data-key="값"을 코드로 붙인다
  hygiene.dataset.key = HYGIENE_FIELD.key;
  // [문법] 요소.classList.add(클래스들): class 속성에 클래스를 추가한다(이미 있으면 그대로)
  hygiene.classList.add('tag-selector', 'tag-selector--warning');

  // reviewFields.js에는 ['문제 있음', '없음'] 순서인데, 화면에서는 "문제 없음"을 앞에 두고 싶다
  // (평범한 경우를 먼저 보여 주려고). 그래서 배열을 뒤에서부터 거꾸로 돌면서 버튼을 만든다
  // [문법] for (let i = 길이 - 1; i >= 0; i -= 1): 마지막 칸부터 0번 칸까지 거꾸로 반복
  let buttons = '';
  for (let i = HYGIENE_FIELD.options.length - 1; i >= 0; i -= 1) {
    const option = HYGIENE_FIELD.options[i];
    buttons += optionButtonHtml(option, hygieneText(option));
  }
  document.getElementById('hygiene-options').innerHTML = buttons;
}

// ----------------------------------------------------------------------------
// updateTagButtons() — tags 값에 맞게 버튼의 "눌림" 표시를 다시 정한다
//
//   예) tags.saltiness가 '짜다'면 → 간 묶음에서 '짜다' 버튼만 aria-pressed="true", 나머지는 "false"
//   위생에서 "문제 있음"을 골랐으면 안내 문구도 보여 준다
// ----------------------------------------------------------------------------
function updateTagButtons() {
  // 묶음(fieldset)마다
  const groups = form.querySelectorAll('.tag-selector');
  for (const group of groups) {
    // 이 묶음에서 고른 값. 예) 간 묶음이면 tags['saltiness']
    const selected = tags[group.dataset.key];
    // 묶음 안의 버튼마다 "내 값 == 고른 값"이면 눌림(true), 아니면 안 눌림(false)
    // (이중 반복문: 바깥은 묶음, 안쪽은 그 묶음의 버튼)
    const buttons = group.querySelectorAll('.tag-selector__option');
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.value === selected));
    }
  }
  // 위생 "문제 있음"을 골랐을 때만 안내 문구를 보여 준다
  // [문법] 비교 결과(true/false)를 그대로 hidden에 넣는다. "문제 있음이 아니면 → 숨기기(true)"
  hygieneHint.hidden = tags[HYGIENE_FIELD.key] !== HYGIENE_PROBLEM;
}

// ============================================================================
// ⭐ 별점 고르기
// ============================================================================
// 별점은 menu.html의 라디오 버튼 5개(<input type="radio" name="rating" value="1~5">)로 고른다.
// 라디오 동그라미는 숨겨 두고(sr-only), 대신 ☆ 모양을 보여 준다.

// ----------------------------------------------------------------------------
// getRating() — 지금 고른 별점 (안 골랐으면 0)
// ----------------------------------------------------------------------------
function getRating() {
  // [문법] form.elements.rating: 폼 안에서 name="rating"인 입력들. 라디오 묶음이면 .value가 "고른 값"('4')
  //        아무것도 안 골랐으면 '' (빈 글자)
  // [문법] Number('') → 0,  Number('4') → 4.  || 0 은 혹시 NaN이 나와도 0으로
  return Number(form.elements.rating.value) || 0;
}

// ----------------------------------------------------------------------------
// updateRatingUi() — 별 모양(★★★★☆)과 "4점 · 좋아요" 글자를 고른 별점에 맞게 바꾼다
// ----------------------------------------------------------------------------
function updateRatingUi() {
  const rating = getRating();
  const stars = form.querySelectorAll('.star-input__star'); // 별 모양 글자 5개
  // [문법] i는 0부터 4까지. 고른 점수가 4면 i = 0,1,2,3 은 ★, i = 4 는 ☆
  for (let i = 0; i < stars.length; i += 1) {
    const filled = i < rating;
    if (filled) {
      stars[i].textContent = '★';
    } else {
      stars[i].textContent = '☆';
    }
    // [문법] classList.toggle(클래스, 참거짓): 두 번째 값이 true면 클래스를 붙이고 false면 뗀다
    stars[i].classList.toggle('is-filled', filled);
  }

  if (rating > 0) {
    // 골랐으면 "4점 · 좋아요"
    ratingValue.textContent = `${rating}점 · ${RATING_LABELS[rating]}`;
    // 전에 "별점을 골라 주세요" 빨간 표시가 있었다면 지운다
    setRatingInvalid(false);
  } else {
    // 안 골랐으면 안내 문구
    ratingValue.textContent = '별을 눌러 1~5점 중에 골라 주세요';
  }
  // 골랐을 때만 is-chosen 클래스 (CSS가 글자를 진하게 바꾼다)
  ratingValue.classList.toggle('is-chosen', rating > 0);
}

// ----------------------------------------------------------------------------
// setRatingInvalid(invalid) — 별점 칸에 "잘못됨" 표시를 켜고(true) 끈다(false)
//
//   별점을 안 고르고 등록하려 하면 별점 칸을 빨갛게 표시한다.
//   [HTML] aria-invalid="true": 이 입력이 잘못됐다고 낭독기에 알려 준다
// ----------------------------------------------------------------------------
function setRatingInvalid(invalid) {
  // CSS가 is-invalid 클래스를 보고 빨간 테두리를 그린다
  starInput.classList.toggle('is-invalid', invalid);
  // 라디오 5개 모두에 aria-invalid를 붙이거나 뗀다
  const inputs = form.querySelectorAll('input[name="rating"]');
  for (const input of inputs) {
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      // [문법] removeAttribute(이름): 그 속성을 아예 지운다
      input.removeAttribute('aria-invalid');
    }
  }
}

// ============================================================================
// ✍️ 의견 글자 수
// ============================================================================

// "12 / 100자"처럼 지금 글자 수를 보여 준다 (글자를 칠 때마다 불린다)
function updateCommentCount() {
  // [문법] 입력창.value: 지금 입력된 글자.  .length: 글자 수
  commentCount.textContent = `${commentInput.value.length} / ${COMMENT_MAX_LENGTH}자`;
}

// ============================================================================
// ⚠️ 오류 표시
// ============================================================================

// ----------------------------------------------------------------------------
// showFormError(message) — 폼 위에 오류 상자를 그리고, 키보드 포커스를 그 상자로 옮긴다
//
//   🤔 왜 포커스를 옮길까?
//     키보드나 낭독기를 쓰는 사람은 화면 위쪽에 오류가 생겨도 모를 수 있다.
//     포커스를 옮기면 바로 그 오류를 읽게 되어 "무엇이 잘못됐는지" 즉시 알 수 있다.
//
//   ┌──────────────────────────────┐
//   │ 등록하지 못했어요              │
//   │ [오류] 별점을 골라 주세요...   │
//   └──────────────────────────────┘
// ----------------------------------------------------------------------------
function showFormError(message) {
  // [HTML] role="alert": 낭독기가 바로 읽는 오류
  // [HTML] tabindex="-1": 원래 div는 포커스를 못 받는데, 이걸 붙이면 코드로 focus() 할 수 있다
  formError.innerHTML = `
    <div class="review-form__error" role="alert" tabindex="-1">
      <p class="review-form__error-title">등록하지 못했어요</p>
      <p class="review-form__error-line"><span class="review-form__error-tag">오류</span><span>${escapeHtml(message)}</span></p>
    </div>`;
  // 방금 넣은 오류 상자로 포커스 옮기기
  // [문법] 요소.firstElementChild: 그 요소 안의 첫 번째 자식 요소 (= 방금 넣은 <div>)
  formError.firstElementChild.focus();
}

// ============================================================================
// 📊 평가 요약과 목록
// ============================================================================

// ----------------------------------------------------------------------------
// averageOf(reviews) — 평가들의 평균 별점 (소수 첫째 자리까지)
//
//   예) 별점 [5, 4, 4] → 합계 13 ÷ 3개 = 4.333... → 4.3
//   ⚠️ 서버(app/stats.py)와 같은 방식으로 계산해야 새로고침 전후 숫자가 똑같다
// ----------------------------------------------------------------------------
function averageOf(reviews) {
  // 평가가 없으면 0 (0으로 나누면 NaN이 되니까 먼저 막는다)
  if (reviews.length === 0) return 0;
  // 별점을 하나씩 더해 합계를 구한다
  let total = 0;
  for (const review of reviews) {
    total += review.rating;
  }
  // 평균을 소수 첫째 자리로 반올림 (10을 곱해 반올림 → 다시 10으로 나누기. 43.33 → 43 → 4.3)
  return Math.round((total / reviews.length) * 10) / 10;
}

// ----------------------------------------------------------------------------
// renderSummary() — 페이지 맨 위 메뉴 카드를 그린다
//
//   [중식] 10월 27일 화요일
//   닭갈비
//   ★ 4.5 / 5 · 평가 2개        (평가가 없으면 "아직 평가가 없어요. 첫 평가를 남겨 보세요")
// ----------------------------------------------------------------------------
function renderSummary() {
  // 식사 번호를 알 때만 '중식' 같은 라벨을 붙인다
  let meal = '';
  if (mealCode) {
    meal = `<span class="chip chip--accent">${MEAL_TYPES[mealCode]}</span>`;
  }
  document.getElementById('menu-meta').innerHTML = `${meal}<span>${formatDate(menu.date)}</span>`;

  // 메뉴 이름. textContent로 넣으면 HTML로 해석되지 않아서 escapeHtml 없이도 안전하다
  document.getElementById('menu-name').textContent = menu.name;

  // 평균 별점 줄
  const summary = document.getElementById('menu-summary');
  if (menu.reviewCount > 0) {
    // 낭독기는 "평균 별점 4.5 / 5 · 평가 2개"로 읽는다 (★는 aria-hidden으로 숨김)
    summary.innerHTML = `<span class="menu-detail__star" aria-hidden="true">★</span>
       <span class="sr-only">평균 별점</span>
       <span class="menu-detail__average">${menu.averageRating.toFixed(1)}</span>
       <span class="menu-detail__count">/ 5 · 평가 ${menu.reviewCount}개</span>`;
  } else {
    summary.innerHTML = '<span class="menu-detail__count">아직 평가가 없어요. 첫 평가를 남겨 보세요</span>';
  }
}

// ----------------------------------------------------------------------------
// renderAllergy() — 나이스에서 이 메뉴의 알레르기를 찾아 "알레르기 유발 식품: 대두, 밀"을 보여 준다
//
//   실패하거나 못 찾으면 그냥 숨겨 둔다. (알레르기 정보는 덤이라 평가에는 영향 없음)
//   식사 번호를 알면 그 끼니에서만, 모르면 세 끼 모두에서 이름으로 찾는다
// ----------------------------------------------------------------------------
async function renderAllergy() {
  // 나이스 정보 가져오기 (실패하면 조용히 끝)
  let info;
  try {
    info = await getMealInfo(menu.date);
  } catch (err) {
    return;
  }

  // 메뉴 찾기
  let dish = null;
  if (mealCode) {
    // 끼니를 알면 그 끼니에서만
    dish = findDish(info[mealCode], menu.name);
  } else {
    // 끼니를 모르면 있는 끼니를 하나씩 다 찾아본다
    // [문법] for (const 키 in 객체): 객체의 이름표(여기선 식사 번호 '1','2','3')를 하나씩 꺼낸다
    for (const code in info) {
      dish = findDish(info[code], menu.name);
      if (dish) break; // 찾았으면 그만 찾는다
    }
  }
  // 못 찾았거나 알레르기가 하나도 없으면 보여 줄 게 없다
  if (!dish || dish.allergies.length === 0) return;

  // 알레르기 글자를 넣고, 숨겨 뒀던 상자를 보이게 한다
  const box = document.getElementById('menu-allergy');
  box.textContent = `알레르기 유발 식품: ${dish.allergies.join(', ')}`;
  // [문법] hidden = false: 숨겨 둔 요소를 보이게
  box.hidden = false;
}

// ----------------------------------------------------------------------------
// reviewHtml(review) — 평가 한 건의 HTML
//
//   ┌──────────────────────────────────────────────────┐
//   │ ★★★★☆ 4점 · 좋아요          [방금 등록] 10월 27일 오후 1:00 │
//   │ [! 위생 문제 있음] [간 · 짜다] [양 · 많다]                    │
//   │ 맛있었어요                                                     │
//   └──────────────────────────────────────────────────┘
//
//   - 위생 "문제 있음"은 가장 앞에 경고 배지로. 위생 "없음"은 굳이 표시하지 않는다
//   - 안 고른 태그(null)와 안 쓴 의견('')은 그리지 않는다
// ----------------------------------------------------------------------------
function reviewHtml(review) {
  // ── 태그 배지들 ──
  let badges = '';
  // 위생 문제가 있으면 맨 앞에 경고 배지
  // [문법] review[HYGIENE_FIELD.key] = review['hygiene'] = review.hygiene
  if (review[HYGIENE_FIELD.key] === HYGIENE_PROBLEM) {
    badges += `<li>${tagBadgeHtml(HYGIENE_FIELD.label, HYGIENE_PROBLEM, true)}</li>`;
  }
  // 간·양·온도·식감 중에서 고른 것만 (안 고른 건 null이라 if에서 걸러진다)
  for (const field of TAG_FIELDS) {
    if (review[field.key]) {
      badges += `<li>${tagBadgeHtml(field.label, review[field.key])}</li>`;
    }
  }
  // 배지가 하나라도 있을 때만 목록(<ul>)으로 감싼다
  let tagsHtml = '';
  if (badges) {
    tagsHtml = `<ul class="review-list__tags" aria-label="선택한 태그">${badges}</ul>`;
  }

  // ── 의견 ──
  // 안 썼으면 빈 글자("")라서 아무것도 안 그린다.
  // ⚠️ 사용자가 직접 쓴 글이라 escapeHtml로 꼭 감싼다! (XSS 방지)
  let commentHtml = '';
  if (review.comment) {
    commentHtml = `<p class="review-list__comment">${escapeHtml(review.comment)}</p>`;
  }

  // ── "방금 등록" 표시 ──
  // 방금 내가 등록한 평가에만 강조 클래스(is-new)와 "방금 등록" 딱지를 붙인다
  let newClass = '';
  let newChip = '';
  if (review.reviewId === newReviewId) {
    newClass = ' is-new';
    newChip = '<span class="chip chip--new">방금 등록</span>';
  }

  // ── 별 모양 ──
  // 4점이면 '★★★★' + '☆' = '★★★★☆'
  // [문법] 문자열.repeat(n): 글자를 n번 반복. '★'.repeat(4) → '★★★★'
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  // [HTML] <time datetime="...">: 기계가 읽는 정확한 시각(datetime)과 사람이 읽는 글자를 함께 담는 태그
  // 별 모양은 aria-hidden으로 숨기고, 낭독기는 옆의 "4점 · 좋아요" 글자를 읽는다
  return `
    <li class="review-list__item${newClass}">
      <div class="review-list__top">
        <p class="review-list__rating">
          <span class="review-list__stars" aria-hidden="true">${stars}</span>
          <span>${review.rating}점 · ${RATING_LABELS[review.rating]}</span>
        </p>
        <p class="review-list__meta">
          ${newChip}
          <time datetime="${escapeHtml(review.createdAt)}">${formatDateTime(review.createdAt)}</time>
        </p>
      </div>
      ${tagsHtml}
      ${commentHtml}
    </li>`;
}

// ----------------------------------------------------------------------------
// renderReviews() — 평가 목록 전체를 다시 그린다
//   평가가 없으면 "아직 평가가 없어요" 빈 화면
// ----------------------------------------------------------------------------
function renderReviews() {
  if (menu.reviews.length === 0) {
    renderEmpty(listBox, '아직 평가가 없어요', '<p class="small">첫 평가를 남겨 보세요. 등록하면 여기에 바로 보여요.</p>');
    return;
  }
  // 평가마다 한 건씩 HTML을 만들어 이어 붙인다
  let items = '';
  for (const review of menu.reviews) {
    items += reviewHtml(review);
  }
  listBox.innerHTML = `<ul class="review-list">${items}</ul>`;
}

// ============================================================================
// 🖱️ 폼 동작
// ============================================================================

// ----------------------------------------------------------------------------
// resetForm() — 폼을 처음 상태로 비운다 (페이지 열 때, 그리고 등록에 성공한 뒤)
// ----------------------------------------------------------------------------
function resetForm() {
  // 별점 라디오와 의견 입력창을 처음 상태로
  // [문법] 폼.reset(): 폼 안의 입력을 모두 처음 상태로 되돌린다(브라우저 내장 기능)
  form.reset();
  // 태그는 우리가 따로 기억하는 값이라 reset()이 모른다 → 직접 비운다
  clearTags();
  // 비운 값에 맞게 화면도 다시 그린다
  updateTagButtons();
  updateCommentCount();
  updateRatingUi();
}

// ----------------------------------------------------------------------------
// onTagClick(button) — 태그 버튼을 눌렀을 때
//
//   이미 고른 값을 또 누르면 → 선택 해제(null)
//   다른 값을 누르면         → 그 값으로 바꾼다
//   예) 간: '짜다' 누름 → tags.saltiness = '짜다'
//           '짜다' 또 누름 → tags.saltiness = null (해제)
//           '적당' 누름 → tags.saltiness = '적당' (바뀜)
// ----------------------------------------------------------------------------
function onTagClick(button) {
  // 이 버튼이 어느 항목인지: 버튼을 감싼 묶음(fieldset)의 data-key. 예) 'saltiness'
  const key = button.closest('.tag-selector').dataset.key;
  // 이 버튼의 값. 예) '짜다'
  const value = button.dataset.value;
  if (tags[key] === value) {
    tags[key] = null; // 같은 걸 또 눌렀으면 해제
  } else {
    tags[key] = value; // 아니면 그 값으로
  }
  updateTagButtons(); // 눌림 표시 다시 그리기
  formSuccess.textContent = ''; // 폼을 다시 만지기 시작했으니 "등록됐어요" 문구는 지운다
}

// ----------------------------------------------------------------------------
// onSubmit(event) — [평가 등록] 버튼(또는 입력창에서 Enter)을 눌렀을 때 ⭐
//
//   🔄 흐름
//     1) 페이지 새로고침 막기, 두 번 누르기 막기, 예전 문구 지우기
//     2) 별점을 안 골랐으면 → 빨간 표시 + 오류 보여 주고 끝 (서버에 보내지도 않는다)
//     3) 버튼을 "등록하는 중…"으로 바꾸고 막기
//     4) 서버에 보내기
//          성공 → 목록 맨 위에 넣기, 평균·개수 다시 계산, 다시 그리기, 폼 비우기, "등록됐어요"
//          실패 → 서버가 보낸 이유를 오류 상자로 보여 주기 (예: "욕설이나 비방 표현은 등록할 수 없어요.")
//     5) 성공이든 실패든 버튼을 원래대로
// ----------------------------------------------------------------------------
async function onSubmit(event) {
  // ── 1) 준비 ──
  // form은 제출하면 원래 페이지를 새로고침한다. 우리는 새로고침 없이 목록에 바로 보여 줄 거라 막는다
  // [문법] event.preventDefault(): 브라우저가 원래 하려던 동작을 막는다
  event.preventDefault();
  // 이미 보내는 중이면 아무것도 안 한다 (두 번 등록 방지)
  if (submitting) return;
  // 예전 오류·성공 문구 지우기
  formError.innerHTML = '';
  formSuccess.textContent = '';

  // ── 2) 별점 확인 ──
  const rating = getRating();
  // 별점은 꼭 필요하다. 서버에 보내기 전에 여기서 먼저 알려 준다 (서버까지 갔다 오면 느리니까)
  if (rating === 0) {
    setRatingInvalid(true);
    showFormError('별점을 골라 주세요. 별점은 꼭 필요해요.');
    return;
  }

  // ── 3) "보내는 중" 상태로 ──
  submitting = true;
  submitButton.disabled = true;
  submitButton.textContent = '등록하는 중…';

  // ── 4) 서버에 보내기 ──
  try {
    // 보내는 내용 (명세서 5장 3번): 메뉴 번호, 별점, 간, 양, 온도, 식감, 위생, 의견
    // [문법] await: 서버 답장을 기다린다. 실패하면 오류가 던져져 catch로 간다
    const saved = await createReview({
      menuId: menu.menuId,
      rating: rating,
      saltiness: tags.saltiness,
      portion: tags.portion,
      temperature: tags.temperature,
      texture: tags.texture,
      hygiene: tags.hygiene,
      // [문법] trim(): 앞뒤 공백을 지운다. 공백만 친 의견은 빈 글자('')가 되어 "의견 없음"으로 보낸다
      comment: commentInput.value.trim(),
    });

    // ✅ 성공! 서버에 목록을 다시 물어보지 않고, 받은 평가를 직접 목록 맨 앞에 넣는다
    // [문법] 배열.unshift(값): 배열 맨 앞에 값을 넣는다 (push는 맨 뒤)
    menu.reviews.unshift(saved);
    menu.reviewCount = menu.reviews.length; // 개수 다시 세기
    menu.averageRating = averageOf(menu.reviews); // 평균 다시 계산
    newReviewId = saved.reviewId; // "방금 등록" 표시할 평가 번호 기억
    renderSummary(); // 위쪽 평균 별점 다시 그리기
    renderReviews(); // 목록 다시 그리기
    resetForm(); // 폼 비우기
    formSuccess.textContent = '✓ 평가가 등록됐어요. 목록 맨 위에서 확인할 수 있어요.';
  } catch (err) {
    // ❌ 실패: 서버가 보낸 이유를 그대로 보여 준다. 폼은 비우지 않는다 (고쳐서 다시 보낼 수 있게)
    showFormError(err.message);
  } finally {
    // ── 5) 성공하든 실패하든 버튼을 원래대로 ──
    // [문법] finally { }: try가 성공하든 catch로 가든, 마지막에 "항상" 실행된다
    submitting = false;
    submitButton.disabled = false;
    submitButton.textContent = '평가 등록';
  }
}

// ----------------------------------------------------------------------------
// setupForm() — 폼의 모든 동작을 연결한다 (페이지 열 때 한 번)
//
//   별점을 바꾸면       → 별 모양과 "4점 · 좋아요" 다시 그리기
//   태그 버튼을 누르면  → onTagClick
//   의견을 입력하면     → 글자 수 다시 세기
//   등록하면            → onSubmit
// ----------------------------------------------------------------------------
function setupForm() {
  // 의견 입력창에 최대 글자 수를 정해 준다 (그 이상은 브라우저가 입력을 막는다)
  // [문법] 입력창.maxLength = 숫자: HTML의 maxlength 속성과 같다
  commentInput.maxLength = COMMENT_MAX_LENGTH;

  // ⭐ 별점 바꾸기
  // [문법] 'change': 라디오·체크박스 등의 값이 바뀌었을 때 일어나는 일
  //        폼 전체에 연결해 두고, 바뀐 게 별점 라디오(name="rating")일 때만 처리한다
  form.addEventListener('change', function (event) {
    // [문법] event.target.name: 바뀐 입력의 name 속성
    if (event.target.name === 'rating') {
      updateRatingUi();
      formSuccess.textContent = '';
    }
  });

  // 🏷️ 태그 버튼 클릭
  // 버튼이 10개가 넘지만 하나하나 연결하지 않고 폼 하나에서 받아서 "태그 버튼인지"만 확인한다 (이벤트 위임)
  form.addEventListener('click', function (event) {
    // 누른 곳에서 위로 올라가며 태그 버튼을 찾는다 (버튼 안의 ✓ 글자를 눌러도 버튼을 찾아 준다)
    // [문법] closest(선택자): 자기 자신부터 부모 쪽으로 올라가며 찾는다. 없으면 null
    const button = event.target.closest('.tag-selector__option');
    if (button) {
      onTagClick(button);
    }
  });

  // ✍️ 의견 입력
  // [문법] 'input': 글자를 한 글자 칠 때마다 일어나는 일
  commentInput.addEventListener('input', function () {
    updateCommentCount();
    formSuccess.textContent = '';
  });

  // ✅ 등록
  // [문법] 'submit': 폼을 제출할 때 (등록 버튼 클릭, 입력창에서 Enter)
  //        함수 이름만 넘긴다(괄호 없이) → 제출할 때마다 onSubmit(event)가 불린다
  form.addEventListener('submit', onSubmit);
}

// ============================================================================
// ▶ 시작
// ============================================================================

// 서버에서 이 메뉴의 정보 + 평가를 불러온다 (loadData에 넘길 "불러오는 함수")
function fetchMenu() {
  return getMenuReviews(menuId);
}

// ----------------------------------------------------------------------------
// showMenu(data) — 불러오기에 성공하면 화면을 그린다 (loadData에 넘길 "성공하면 할 일")
//   data: 서버가 준 { menuId, name, date, averageRating, reviewCount, reviews }
// ----------------------------------------------------------------------------
function showMenu(data) {
  menu = data; // 상태에 저장
  stateBox.innerHTML = ''; // "불러오는 중" 지우기
  content.hidden = false; // 숨겨 둔 본문 보여 주기
  // 브라우저 탭 제목을 "닭갈비 평가 · MealMeter"로
  // [문법] document.title: 브라우저 탭에 보이는 제목
  document.title = `${data.name} 평가 · MealMeter`;
  renderSummary(); // 위쪽 메뉴 카드
  renderReviews(); // 평가 목록
  renderAllergy(); // 알레르기 (나이스 답장을 기다리지 않고 진행. 오면 알아서 보여 줌)
}

// ----------------------------------------------------------------------------
// start() — 페이지를 열면 한 번 실행되는 시작 함수
// ----------------------------------------------------------------------------
function start() {
  // 주소에 메뉴 번호가 없으면 (예: menu.html 만 열었을 때) 오류를 보여 주고 끝
  // (params.get('menuId')가 null이면 !null = true)
  if (!menuId) {
    renderError(stateBox, '메뉴 번호가 없어요. 오늘의 메뉴에서 평가할 메뉴를 골라 주세요.');
    return;
  }

  buildTagSelectors(); // 태그 버튼 만들기
  setupForm(); // 폼 동작 연결
  resetForm(); // 폼을 처음 상태로 (별 모양, 글자 수 등 표시 맞추기)

  // "불러오는 중" → fetchMenu() → 성공하면 showMenu(데이터) / 실패하면 오류 + 다시 시도
  // [문법] fetchMenu, showMenu: 괄호 없이 함수 이름만 넘기면 loadData가 알맞은 때에 불러 준다(콜백)
  loadData(stateBox, fetchMenu, showMenu, '평가를 불러오는 중이에요');
}

start();
