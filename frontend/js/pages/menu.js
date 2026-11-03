// 역할: 메뉴 상세 페이지 동작 — 평가 불러오기, 평가 폼, 평가 목록 (명세서 3장 기능 2). 담당: 박준호
// 순서: 주소에서 메뉴 번호 꺼내기 → 태그 버튼 만들기 → 폼 동작 연결 → 서버에서 평가 불러오기 → 나이스에서 알레르기 덧붙이기
// 새 평가를 등록하면 새로고침 없이 목록 맨 위에 넣고, 평균·개수를 다시 계산하고, 폼을 비운다.
// [문법] import { 이름들 } from '경로': 다른 모듈이 export한 것을 가져온다
import { createReview, getMealInfo, getMenuReviews } from '../api/index.js';
import { findDish } from '../api/neis.js';
// [문법] import { ... } 를 여러 줄에 나눠 쓸 수도 있다(가져올 이름이 많을 때)
import {
  COMMENT_MAX_LENGTH, HYGIENE_FIELD, HYGIENE_PROBLEM, MEAL_TYPES, RATING_LABELS, TAG_FIELDS,
} from '../api/reviewFields.js';
import { escapeHtml, formatDate, formatDateTime } from '../common/format.js';
import { loadData, renderEmpty, renderError } from '../common/state.js';
import { tagBadgeHtml } from '../common/ui.js';

// ---------- HTML에서 쓸 자리 찾아 두기 ----------
// [문법] document.getElementById('id'): 그 id를 가진 HTML 요소를 찾아 변수에 담아 둔다(여러 번 쓰려고)
const stateBox = document.getElementById('menu-state');
const content = document.getElementById('menu-content');
const form = document.getElementById('review-form');
const starInput = document.getElementById('star-input');
const ratingValue = document.getElementById('rating-value');
const commentInput = document.getElementById('review-comment');
const commentCount = document.getElementById('comment-count');
const submitButton = document.getElementById('review-submit');
const formError = document.getElementById('review-form-error');
const formSuccess = document.getElementById('review-form-success');
const hygieneHint = document.getElementById('hygiene-hint');
const listBox = document.getElementById('review-list');

// ---------- 페이지가 기억하는 값 ----------
// 주소 menu.html?menuId=3&meal=2 에서 "3"과 2를 꺼낸다
// [문법] window.location.search: 주소의 ? 뒤 부분('?menuId=3&meal=2')
// [문법] new URLSearchParams(...): 그 글자를 읽기 쉽게 해 주는 도구. params.get('menuId') → '3'(글자, 없으면 null)
const params = new URLSearchParams(window.location.search);
const menuId = params.get('menuId');
// [문법] 올바른 식사 코드(1~3)면 숫자로, 아니면 null. 삼항 연산자
const mealCode = MEAL_TYPES[params.get('meal')] ? Number(params.get('meal')) : null;

// [문법] let: 나중에 값이 바뀌는 변수. null = '아직 값 없음'을 직접 표시
let menu = null; // 서버에서 받은 메뉴 정보 + 평가 목록 { menuId, name, date, averageRating, reviewCount, reviews }
let newReviewId = null; // 방금 등록한 평가 (목록에서 강조)
let submitting = false; // 서버에 보내는 중인지 (두 번 누르기 방지)

// 고른 태그. 처음에는 모두 "안 고름"(null)
// → { saltiness: null, portion: null, temperature: null, texture: null, hygiene: null }
// [문법] [...배열, 값]: 배열을 펼치고 뒤에 하나를 더 붙인 새 배열
const ALL_FIELDS = [...TAG_FIELDS, HYGIENE_FIELD];
// [문법] map으로 [키, null] 쌍을 만들고 Object.fromEntries로 객체로 → { saltiness: null, ... }
// [문법] const 객체라도 tags.saltiness = '짜다' 처럼 안의 값은 바꿀 수 있다
const tags = Object.fromEntries(ALL_FIELDS.map((field) => [field.key, null]));

// 위생 버튼에 보이는 글자 (서버 값 "없음"은 화면에서 "문제 없음"으로 보여 준다)
// [문법] { [식]: 값 }: 계산된 속성 이름. 대괄호 안 변수의 값('문제 있음')이 키가 된다
const HYGIENE_TEXT = { [HYGIENE_PROBLEM]: '문제 있음', 없음: '문제 없음' };

// ================= 태그 선택 버튼 =================

// 태그 선택 버튼 하나. option: 서버로 보낼 값, text: 화면에 보일 글자 (보통 같다)
// [문법] text = option: 기본값으로 앞 매개변수 값을 쓸 수 있다
function optionButtonHtml(option, text = option) {
  // type="button": form 안의 버튼은 기본이 "제출"이라, 이걸 안 쓰면 태그만 눌러도 평가가 등록돼 버린다
  // aria-pressed: 화면 낭독기가 "눌림 / 안 눌림"을 읽어 준다 (켜고 끄는 버튼)
  // [문법] 백틱 템플릿 리터럴로 버튼 HTML 글자를 만든다. data-value: 버튼이 가진 값을 HTML에 적어 둔다
  return `
    <button type="button" class="tag-selector__option" aria-pressed="false" data-value="${escapeHtml(option)}">
      <span class="tag-selector__check" aria-hidden="true">✓</span>${escapeHtml(text)}
    </button>`;
}

// 항목 하나(예: 간)의 버튼 묶음. 선택지는 reviewFields.js에서 가져온다 (한 곳에서만 관리)
// legend는 화면 낭독기용으로 두고, 화면에는 왼쪽에 짧은 이름을 따로 보여 준다 (legend는 줄 배치가 어려워서)
// [문법] <fieldset>: 관련된 입력들을 묶는 상자, <legend>: 그 묶음의 이름(낭독기가 읽음)
function tagSelectorHtml(field) {
  return `
    <fieldset class="tag-selector" data-key="${field.key}">
      <legend class="sr-only">${escapeHtml(field.label)}</legend>
      <span class="tag-selector__label" aria-hidden="true">${escapeHtml(field.label)}</span>
      <div class="tag-selector__options">${field.options.map((option) => optionButtonHtml(option)).join('')}</div>
    </fieldset>`;
}

// 태그 버튼들을 화면에 만든다 (간·양·온도·식감 + 위생)
// [문법] TAG_FIELDS.map(tagSelectorHtml): 함수 이름을 넘겨 항목마다 HTML을 만들고 join('')으로 잇는다
function buildTagSelectors() {
  document.getElementById('tag-groups').innerHTML = TAG_FIELDS.map(tagSelectorHtml).join('');
  // 위생은 "문제 없음"을 앞에 두고, 이미 있는 위생 fieldset 안에 넣는다
  const hygiene = document.getElementById('hygiene-group');
  // [문법] 요소.dataset.key = 값: HTML 속성 data-key="값"을 코드로 붙인다
  hygiene.dataset.key = HYGIENE_FIELD.key;
  // [문법] 요소.classList.add(클래스들): class 속성에 클래스를 추가한다(이미 있으면 그대로)
  hygiene.classList.add('tag-selector', 'tag-selector--warning');
  // [문법] [...배열]: 복사본을 만든다. .reverse()는 원본을 뒤집어 버리기 때문에 복사본에서 뒤집는다
  // [문법] HYGIENE_TEXT[option] ?? option: 화면용 글자가 있으면 그걸, 없으면 원래 값
  document.getElementById('hygiene-options').innerHTML = [...HYGIENE_FIELD.options]
    .reverse()
    .map((option) => optionButtonHtml(option, HYGIENE_TEXT[option] ?? option))
    .join('');
}

// tags 값에 맞게 버튼의 "눌림" 표시를 다시 그린다
// [문법] tags 객체 값에 맞춰 버튼마다 aria-pressed(눌림 표시)를 다시 정한다
function updateTagButtons() {
  // [문법] querySelectorAll(...).forEach: 찾은 요소마다 함수 실행. 안에서 또 forEach를 쓴 '중첩 반복'
  form.querySelectorAll('.tag-selector').forEach((group) => {
    const selected = tags[group.dataset.key];
    group.querySelectorAll('.tag-selector__option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === selected));
    });
  });
  // [문법] 비교 결과(true/false)를 그대로 hidden에 넣는다. 위생 문제가 아니면 숨긴다
  hygieneHint.hidden = tags[HYGIENE_FIELD.key] !== HYGIENE_PROBLEM;
}

// ================= 별점 =================

// 지금 고른 별점 (안 골랐으면 0)
function getRating() {
  // [문법] form.elements.rating: 폼 안에서 name="rating"인 입력들. 라디오 묶음이면 .value가 '고른 값'
  // [문법] Number('') 은 0, || 0 으로 안 골랐을 때 0
  return Number(form.elements.rating.value) || 0;
}

// 별 모양과 "4점 · 좋아요" 글자를 바꾼다
function updateRatingUi() {
  const rating = getRating();
  // [문법] forEach의 두 번째 인자 index: 0부터 시작하는 순서
  form.querySelectorAll('.star-input__star').forEach((star, index) => {
    const filled = index < rating; // 고른 점수까지는 꽉 찬 별
    star.textContent = filled ? '★' : '☆';
    // [문법] classList.toggle(클래스, 참거짓): 두 번째 값이 true면 붙이고 false면 뗀다
    star.classList.toggle('is-filled', filled);
  });
  // [문법] rating이 0이면 거짓 → 안내 문구, 아니면 '4점 · 좋아요'
  ratingValue.textContent = rating ? `${rating}점 · ${RATING_LABELS[rating]}` : '별을 눌러 1~5점 중에 골라 주세요';
  ratingValue.classList.toggle('is-chosen', rating > 0);
  if (rating > 0) setRatingInvalid(false);
}

// 별점을 안 고르고 등록하려 했을 때 별점 칸을 빨갛게 표시한다
// [문법] aria-invalid="true": 이 입력이 잘못됐다고 낭독기에 알려 준다
function setRatingInvalid(invalid) {
  starInput.classList.toggle('is-invalid', invalid);
  form.querySelectorAll('input[name="rating"]').forEach((input) => {
    // [문법] if ... else 를 중괄호 없이 한 줄씩 썼다. removeAttribute(이름): 속성을 지운다
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });
}

// ================= 의견 글자 수 =================

function updateCommentCount() {
  // [문법] 입력창.value: 지금 입력된 글자. .length: 글자 수
  commentCount.textContent = `${commentInput.value.length} / ${COMMENT_MAX_LENGTH}자`;
}

// ================= 오류 표시 =================

// 오류 상자를 그리고 포커스를 옮겨서, 키보드·낭독기 사용자도 무엇이 잘못됐는지 바로 알게 한다
function showFormError(message) {
  // [문법] role="alert": 낭독기가 바로 읽는 오류. tabindex="-1": 코드로 focus() 할 수 있게
  formError.innerHTML = `
    <div class="review-form__error" role="alert" tabindex="-1">
      <p class="review-form__error-title">등록하지 못했어요</p>
      <p class="review-form__error-line"><span class="review-form__error-tag">오류</span><span>${escapeHtml(message)}</span></p>
    </div>`;
  // [문법] 요소.firstElementChild: 첫 번째 자식 요소(방금 넣은 오류 상자)
  formError.firstElementChild.focus();
}

// ================= 평가 요약과 목록 =================

// 평균 별점을 소수 첫째 자리까지 계산한다 (서버 app/stats.py와 같은 방식)
function averageOf(reviews) {
  if (reviews.length === 0) return 0;
  // [문법] 배열.reduce: 별점을 하나씩 더해 합계 하나로 줄인다(시작값 0)
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

// 페이지 위쪽 메뉴 카드: 식사 구분·날짜, 메뉴 이름, 평균 별점·평가 수
function renderSummary() {
  // [문법] 식사 코드가 있을 때만 '중식' 같은 라벨 HTML
  const meal = mealCode ? `<span class="chip chip--accent">${MEAL_TYPES[mealCode]}</span>` : '';
  document.getElementById('menu-meta').innerHTML = `${meal}<span>${formatDate(menu.date)}</span>`;
  // [문법] textContent: 메뉴 이름을 순수 글자로 넣는다(HTML로 해석 안 됨 → 안전)
  document.getElementById('menu-name').textContent = menu.name;
  // [문법] 조건 ? 템플릿 : 글자 를 여러 줄에 나눠 쓴 삼항 연산자
  document.getElementById('menu-summary').innerHTML = menu.reviewCount > 0
    ? `<span class="menu-detail__star" aria-hidden="true">★</span>
       <span class="sr-only">평균 별점</span>
       <span class="menu-detail__average">${menu.averageRating.toFixed(1)}</span>
       <span class="menu-detail__count">/ 5 · 평가 ${menu.reviewCount}개</span>`
    : '<span class="menu-detail__count">아직 평가가 없어요. 첫 평가를 남겨 보세요</span>';
}

// 나이스에서 알레르기 정보를 찾아 덧붙인다. 못 찾거나 실패하면 그냥 숨겨 둔다 (평가에는 영향 없음)
// [문법] async: 나이스 응답을 await로 기다린다. 실패하면 조용히 return
async function renderAllergy() {
  let info;
  try {
    info = await getMealInfo(menu.date);
  } catch {
    return;
  }
  // 식사 코드를 알면 그 끼니에서, 모르면 세 끼 모두에서 찾는다
  // [문법] Object.values(객체): 값들만 배열로. 식사를 알면 그 하나만 배열에 담는다
  const meals = mealCode ? [info[mealCode]] : Object.values(info);
  // [문법] find(Boolean): 처음으로 '참인 값'(null이 아닌 결과)을 고른다
  const dish = meals.map((meal) => findDish(meal, menu.name)).find(Boolean);
  // [문법] dish가 없거나 알레르기가 0개면(0은 거짓) 그만
  if (!dish?.allergies.length) return;

  const box = document.getElementById('menu-allergy');
  box.textContent = `알레르기 유발 식품: ${dish.allergies.join(', ')}`;
  // [문법] hidden = false: 숨겨 둔 요소를 보이게
  box.hidden = false;
}

// 평가 한 건 (별점, 태그 배지, 의견, 작성 시각)
function reviewHtml(review) {
  // 위생 문제는 가장 먼저, 경고 모양으로 보여 준다. "없음"은 굳이 표시하지 않는다
  // [문법] 빈 배열을 만들고 push로 하나씩 채운다
  const badges = [];
  // [문법] review['hygiene']: 대괄호로 변수에 든 이름의 속성을 꺼낸다
  if (review[HYGIENE_FIELD.key] === HYGIENE_PROBLEM) {
    badges.push(tagBadgeHtml(HYGIENE_FIELD.label, HYGIENE_PROBLEM, true));
  }
  // 고른 태그만 배지로 보여 준다 (안 고른 항목은 null이라 빠진다)
  TAG_FIELDS.forEach((field) => {
    if (review[field.key]) badges.push(tagBadgeHtml(field.label, review[field.key]));
  });

  // [문법] 배지가 있으면 <ul> 목록, 없으면 빈 글자. 안쪽 map에서 템플릿 리터럴을 또 썼다(중첩)
  const tagsHtml = badges.length
    ? `<ul class="review-list__tags" aria-label="선택한 태그">${badges.map((badge) => `<li>${badge}</li>`).join('')}</ul>`
    : '';
  // 의견은 안 쓰면 빈 문자열("")이라 그때는 아무것도 그리지 않는다. escapeHtml로 꼭 감싼다!
  const commentHtml = review.comment ? `<p class="review-list__comment">${escapeHtml(review.comment)}</p>` : '';
  const isNew = review.reviewId === newReviewId;
  // [문법] 문자열.repeat(n): 글자를 n번 반복. + 로 두 글자를 잇는다
  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  // <time>: 기계가 읽는 시각(datetime)과 사람이 읽는 글자를 함께 담는다
  // [문법] <time datetime="...">: 기계가 읽는 시각과 사람이 읽는 글자를 함께 담는 태그
  // [문법] ${isNew ? ' is-new' : ''}: 방금 등록한 평가에만 클래스를 붙인다
  return `
    <li class="review-list__item${isNew ? ' is-new' : ''}">
      <div class="review-list__top">
        <p class="review-list__rating">
          <span class="review-list__stars" aria-hidden="true">${stars}</span>
          <span>${review.rating}점 · ${RATING_LABELS[review.rating]}</span>
        </p>
        <p class="review-list__meta">
          ${isNew ? '<span class="chip chip--new">방금 등록</span>' : ''}
          <time datetime="${escapeHtml(review.createdAt)}">${formatDateTime(review.createdAt)}</time>
        </p>
      </div>
      ${tagsHtml}
      ${commentHtml}
    </li>`;
}

// 평가 목록 전체를 다시 그린다 (없으면 "아직 평가가 없어요")
function renderReviews() {
  if (menu.reviews.length === 0) {
    renderEmpty(listBox, '아직 평가가 없어요', '<p class="small">첫 평가를 남겨 보세요. 등록하면 여기에 바로 보여요.</p>');
    return;
  }
  // [문법] menu.reviews.map(reviewHtml).join(''): 평가마다 <li> 글자를 만들어 잇는다
  listBox.innerHTML = `<ul class="review-list">${menu.reviews.map(reviewHtml).join('')}</ul>`;
}

// ================= 폼 동작 연결 =================

// 평가를 등록한 뒤 폼을 처음 상태로 비운다
function resetForm() {
  // [문법] 폼.reset(): 폼 안 입력을 모두 처음 상태로 되돌린다(브라우저 내장 기능)
  form.reset(); // 별점 라디오와 의견 입력창을 처음 상태로
  // [문법] 모든 태그 값을 null(안 고름)로
  ALL_FIELDS.forEach((field) => { tags[field.key] = null; });
  updateTagButtons();
  updateCommentCount();
  updateRatingUi();
}

// 폼의 모든 동작(별점, 태그, 의견 글자 수, 등록)을 연결한다. 페이지를 열 때 한 번만 실행한다
function setupForm() {
  // [문법] 입력창.maxLength: 이 글자 수보다 더 입력하지 못하게 브라우저가 막는다
  commentInput.maxLength = COMMENT_MAX_LENGTH; // 정해진 글자 수보다 더 못 쓰게 막는다

  // 별점을 바꾸면 화면을 다시 그린다
  // [문법] 'change': 라디오·체크박스 등의 값이 바뀌었을 때 일어나는 이벤트
  form.addEventListener('change', (event) => {
    // [문법] event.target.name: 바뀐 입력의 name 속성
    if (event.target.name === 'rating') {
      updateRatingUi();
      formSuccess.textContent = '';
    }
  });

  // 태그 버튼 클릭 — 버튼마다 따로 연결하지 않고 폼 하나에서 받아 처리한다
  // [문법] 이벤트 위임: 폼 하나에 클릭을 연결해서 안의 태그 버튼 클릭을 모두 받는다
  form.addEventListener('click', (event) => {
    // [문법] closest: 누른 곳에서 위로 올라가며 태그 버튼을 찾는다(없으면 null)
    const button = event.target.closest('.tag-selector__option');
    if (!button) return; // 태그 버튼이 아닌 곳을 누르면 무시

    // [문법] 버튼이 속한 묶음(fieldset)의 data-key 값
    const key = button.closest('.tag-selector').dataset.key;
    const value = button.dataset.value;
    // 이미 고른 값을 또 누르면 선택 해제(null), 아니면 그 값으로 바꾼다
    // [문법] 같은 값을 또 누르면 null(해제), 아니면 그 값. 대입(=)의 오른쪽에 삼항 연산자
    tags[key] = tags[key] === value ? null : value;
    updateTagButtons();
    formSuccess.textContent = '';
  });

  // [문법] 'input': 글자를 입력할 때마다 일어나는 이벤트
  commentInput.addEventListener('input', () => {
    updateCommentCount();
    formSuccess.textContent = '';
  });

  // [문법] 'submit': 폼을 제출할 때(등록 버튼, 엔터). async 화살표 함수라 안에서 await를 쓴다
  form.addEventListener('submit', async (event) => {
    // form의 기본 동작(페이지 새로고침)을 막는다. 새로고침 없이 목록에 바로 보여 줘야 하니까.
    // [문법] event.preventDefault(): 폼 제출의 기본 동작(페이지 새로고침)을 막는다
    event.preventDefault();
    // [문법] 이미 보내는 중이면 아무것도 안 한다(두 번 누르기 방지)
    if (submitting) return;
    formError.innerHTML = '';
    formSuccess.textContent = '';

    const rating = getRating();
    // 별점은 꼭 필요하다. 서버에 보내기 전에 여기서 먼저 알려 준다
    if (rating === 0) {
      setRatingInvalid(true);
      showFormError('별점을 골라 주세요. 별점은 꼭 필요해요.');
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    // [문법] 버튼 글자를 바꿔 진행 중임을 보여 준다
    submitButton.textContent = '등록하는 중…';

    try {
      // 명세서 5장 3번: 메뉴 번호, 별점, 간, 양, 온도, 식감, 위생, 의견
      // [문법] await: 서버 응답을 기다린다. 실패하면 오류가 던져져 catch로 간다
      // [문법] ...tags: 태그 객체를 펼쳐서 saltiness, portion 등을 이 객체에 그대로 넣는다
      const saved = await createReview({
        menuId: menu.menuId,
        rating,
        ...tags,
        comment: commentInput.value.trim(), // 앞뒤 공백만 있는 의견은 빈칸으로 보낸다
      });

      // 서버에 다시 묻지 않고, 받은 평가를 목록 맨 앞에 넣고 평균·개수를 다시 계산한다
      // [문법] [새것, ...기존]: 새 평가를 맨 앞에 둔 새 배열
      menu.reviews = [saved, ...menu.reviews];
      menu.reviewCount = menu.reviews.length;
      menu.averageRating = averageOf(menu.reviews);
      newReviewId = saved.reviewId;
      renderSummary();
      renderReviews();
      resetForm();
      formSuccess.textContent = '✓ 평가가 등록됐어요. 목록 맨 위에서 확인할 수 있어요.';
    // [문법] catch (err): 던져진 오류 객체를 err로 받는다
    } catch (err) {
      // 서버(또는 가짜 서버)가 보낸 메시지를 그대로 보여 준다. 예: "욕설이나 비방 표현은 등록할 수 없어요."
      showFormError(err.message);
    // [문법] finally { }: 성공하든 실패하든 마지막에 항상 실행된다
    } finally {
      // 성공하든 실패하든 "보내는 중" 상태는 끝낸다
      submitting = false;
      submitButton.disabled = false;
      submitButton.textContent = '평가 등록';
    }
  });
}

// ================= 시작 =================

// [문법] 페이지를 열 때 한 번 실행되는 시작 함수
function start() {
  // 주소에 메뉴 번호가 없으면 (예: menu.html 만 열었을 때)
  // [문법] 주소에 menuId가 없으면 params.get이 null → !null 은 true
  if (!menuId) {
    renderError(stateBox, '메뉴 번호가 없어요. 오늘의 메뉴에서 평가할 메뉴를 골라 주세요.');
    return;
  }

  buildTagSelectors();
  setupForm();
  resetForm();

  // [문법] loadData(상자, 불러올함수, 성공하면할일, 문구): 세 번째 인자로 화살표 함수를 바로 써서 넘긴다
  loadData(stateBox, () => getMenuReviews(menuId), (data) => {
    menu = data;
    stateBox.innerHTML = ''; // "불러오는 중" 지우기
    content.hidden = false; // 숨겨 둔 내용 보여 주기
    // [문법] document.title: 브라우저 탭 제목을 바꾼다
    document.title = `${data.name} 평가 · MealMeter`; // 브라우저 탭 제목
    renderSummary();
    renderReviews();
    renderAllergy();
  }, '평가를 불러오는 중이에요');
}

// [문법] 파일 맨 아래에서 시작 함수를 부른다
start();
