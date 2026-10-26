// 역할: 메뉴 상세 페이지 동작 — 평가 불러오기, 평가 폼, 평가 목록 (명세서 3장 기능 2). 담당: 박준호
// 순서: 주소에서 메뉴 번호 꺼내기 → 태그 버튼 만들기 → 폼 동작 연결 → 서버에서 평가 불러오기
// 새 평가를 등록하면 새로고침 없이 목록 맨 위에 넣고, 평균·개수를 다시 계산하고, 폼을 비운다.
import { createReview, getMenuReviews } from '../api/index.js';
import { COMMENT_MAX_LENGTH, HYGIENE_FIELD, HYGIENE_PROBLEM, TAG_FIELDS } from '../api/reviewFields.js';
import { escapeHtml, formatDate, formatDateTime } from '../common/format.js';
import { errorHtml, loadData, renderEmpty, renderError } from '../common/state.js';
import { starRatingHtml, tagBadgeHtml } from '../common/ui.js';

// ---------- HTML에서 쓸 자리 찾아 두기 ----------
const stateBox = document.getElementById('menu-state');
const content = document.getElementById('menu-content');
const form = document.getElementById('review-form');
const starInput = document.getElementById('star-input');
const ratingValue = document.getElementById('rating-value');
const ratingHint = document.getElementById('rating-hint');
const commentInput = document.getElementById('review-comment');
const commentCount = document.getElementById('comment-count');
const submitButton = document.getElementById('review-submit');
const formError = document.getElementById('review-form-error');
const formSuccess = document.getElementById('review-form-success');
const listBox = document.getElementById('review-list');

// ---------- 페이지가 기억하는 값 ----------
// 주소 menu.html?menuId=3 에서 "3"을 꺼낸다
const menuId = new URLSearchParams(window.location.search).get('menuId');

let menu = null; // 서버에서 받은 메뉴 정보 + 평가 목록 { menuId, name, date, averageRating, reviewCount, reviews }
let submitting = false; // 서버에 보내는 중인지 (두 번 누르기 방지)

// 고른 태그. 처음에는 모두 "안 고름"(null)
// → { saltiness: null, portion: null, temperature: null, texture: null, hygiene: null }
const ALL_FIELDS = [...TAG_FIELDS, HYGIENE_FIELD];
const tags = Object.fromEntries(ALL_FIELDS.map((field) => [field.key, null]));

// ================= 태그 선택 버튼 =================

// 항목 하나(예: 간)의 버튼 묶음 HTML. 선택지는 reviewFields.js에서 가져온다 (한 곳에서만 관리)
function tagSelectorHtml(field, warning = false) {
  const buttons = field.options.map((option) => `
    <button type="button" class="tag-selector__option" aria-pressed="false" data-value="${escapeHtml(option)}">
      <span class="tag-selector__check" aria-hidden="true">✓</span>${escapeHtml(option)}
    </button>`).join('');

  // type="button": form 안의 버튼은 기본이 "제출"이라, 이걸 안 쓰면 태그만 눌러도 평가가 등록돼 버린다
  // aria-pressed: 화면 낭독기가 "눌림 / 안 눌림"을 읽어 준다 (켜고 끄는 버튼)
  return `
    <fieldset class="tag-selector${warning ? ' tag-selector--warning' : ''}" data-key="${field.key}">
      <legend class="tag-selector__legend">${escapeHtml(field.label)}</legend>
      <div class="tag-selector__options">${buttons}</div>
    </fieldset>`;
}

function buildTagSelectors() {
  document.getElementById('tag-groups').innerHTML = TAG_FIELDS.map((field) => tagSelectorHtml(field)).join('');
  // 위생은 안내 문구 위에 따로 넣는다
  document.getElementById('hygiene-group').insertAdjacentHTML('afterbegin', tagSelectorHtml(HYGIENE_FIELD, true));
}

// tags 값에 맞게 버튼의 "눌림" 표시를 다시 그린다
function updateTagButtons() {
  form.querySelectorAll('.tag-selector').forEach((group) => {
    const selected = tags[group.dataset.key];
    group.querySelectorAll('.tag-selector__option').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.value === selected));
    });
  });
}

// ================= 별점 =================

// 지금 고른 별점 (안 골랐으면 0)
function getRating() {
  return Number(form.elements.rating.value) || 0;
}

// 별점에 맞게 별 모양·숫자·안내 문구·등록 버튼을 바꾼다
function updateRatingUi() {
  const rating = getRating();

  form.querySelectorAll('.star-input__star').forEach((star, index) => {
    const filled = index < rating; // 고른 점수까지는 꽉 찬 별
    star.textContent = filled ? '★' : '☆';
    star.classList.toggle('is-filled', filled);
  });
  ratingValue.textContent = rating ? `${rating}점` : '골라 주세요';

  // 별점을 안 골랐으면: 안내 문구를 보여 주고 등록 버튼을 막는다 (서버에 보내기 전에 막기)
  const missing = rating === 0;
  ratingHint.hidden = !missing;
  if (missing) starInput.setAttribute('aria-describedby', 'rating-hint');
  else starInput.removeAttribute('aria-describedby');
  submitButton.disabled = missing || submitting;
}

// ================= 의견 글자 수 =================

function updateCommentCount() {
  commentCount.textContent = `${commentInput.value.length} / ${COMMENT_MAX_LENGTH}자`;
}

// ================= 평가 요약과 목록 =================

// 평균 별점을 소수 첫째 자리까지 계산한다 (가짜 서버 mock.js와 같은 방식)
function averageOf(reviews) {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((total / reviews.length) * 10) / 10;
}

function renderSummary() {
  document.getElementById('menu-date').textContent = formatDate(menu.date);
  document.getElementById('menu-name').textContent = menu.name;
  document.getElementById('menu-summary').innerHTML = menu.reviewCount > 0
    ? `${starRatingHtml(menu.averageRating)}<span class="muted">평가 ${menu.reviewCount}개</span>`
    : '<span class="muted">아직 평가가 없어요</span>';
}

// 평가 카드 하나 (별점, 태그 배지, 의견, 작성 시각)
function reviewHtml(review) {
  // 위생 문제는 가장 먼저, 경고 모양으로 보여 준다. "없음"은 굳이 표시하지 않는다
  const badges = [];
  if (review[HYGIENE_FIELD.key] === HYGIENE_PROBLEM) {
    badges.push(tagBadgeHtml(HYGIENE_FIELD.label, HYGIENE_PROBLEM, true));
  }
  // 고른 태그만 배지로 보여 준다 (안 고른 항목은 null이라 빠진다)
  TAG_FIELDS.forEach((field) => {
    if (review[field.key]) badges.push(tagBadgeHtml(field.label, review[field.key]));
  });

  const tagsHtml = badges.length
    ? `<ul class="review-list__tags" aria-label="선택한 태그">${badges.map((badge) => `<li>${badge}</li>`).join('')}</ul>`
    : '';
  // 의견은 안 쓰면 빈 문자열("")이라 그때는 아무것도 그리지 않는다. escapeHtml로 꼭 감싼다!
  const commentHtml = review.comment ? `<p class="review-list__comment">${escapeHtml(review.comment)}</p>` : '';

  // <time>: 기계가 읽는 시각(datetime)과 사람이 읽는 글자를 함께 담는다
  return `
    <li class="card review-list__item">
      <div class="review-list__top">
        ${starRatingHtml(review.rating, { showValue: false })}
        <time class="muted small" datetime="${escapeHtml(review.createdAt)}">${formatDateTime(review.createdAt)}</time>
      </div>
      ${tagsHtml}
      ${commentHtml}
    </li>`;
}

function renderReviews() {
  if (menu.reviews.length === 0) {
    renderEmpty(listBox, '아직 평가가 없어요. 첫 평가를 남겨 보세요');
    return;
  }
  listBox.innerHTML = `<ul class="review-list">${menu.reviews.map(reviewHtml).join('')}</ul>`;
}

// ================= 폼 동작 연결 =================

function resetForm() {
  form.reset(); // 별점 라디오와 의견 입력창을 처음 상태로
  ALL_FIELDS.forEach((field) => { tags[field.key] = null; });
  updateTagButtons();
  updateCommentCount();
  updateRatingUi();
}

function setupForm() {
  commentInput.maxLength = COMMENT_MAX_LENGTH; // 정해진 글자 수보다 더 못 쓰게 막는다

  // 별점을 바꾸면 화면을 다시 그린다
  form.addEventListener('change', (event) => {
    if (event.target.name === 'rating') {
      updateRatingUi();
      formSuccess.textContent = '';
    }
  });

  // 태그 버튼 클릭 — 버튼마다 따로 연결하지 않고 폼 하나에서 받아 처리한다
  form.addEventListener('click', (event) => {
    const button = event.target.closest('.tag-selector__option');
    if (!button) return; // 태그 버튼이 아닌 곳을 누르면 무시

    const key = button.closest('.tag-selector').dataset.key;
    const value = button.dataset.value;
    // 이미 고른 값을 또 누르면 선택 해제(null), 아니면 그 값으로 바꾼다
    tags[key] = tags[key] === value ? null : value;
    updateTagButtons();
    formSuccess.textContent = '';
  });

  commentInput.addEventListener('input', () => {
    updateCommentCount();
    formSuccess.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    // form의 기본 동작(페이지 새로고침)을 막는다. 새로고침 없이 목록에 바로 보여 줘야 하니까.
    event.preventDefault();
    const rating = getRating();
    // 버튼이 막혀 있어도 Enter 키 등으로 들어올 수 있어서 한 번 더 검사한다
    if (rating === 0 || submitting) return;

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = '등록하는 중…';
    formError.innerHTML = '';
    formSuccess.textContent = '';

    try {
      // 명세서 5장 3번: 메뉴 번호, 별점, 간, 양, 온도, 식감, 위생, 의견
      const saved = await createReview({
        menuId: menu.menuId,
        rating,
        ...tags,
        comment: commentInput.value.trim(), // 앞뒤 공백만 있는 의견은 빈칸으로 보낸다
      });

      // 서버에 다시 묻지 않고, 받은 평가를 목록 맨 앞에 넣고 평균·개수를 다시 계산한다
      menu.reviews = [saved, ...menu.reviews];
      menu.reviewCount = menu.reviews.length;
      menu.averageRating = averageOf(menu.reviews);
      renderSummary();
      renderReviews();
      resetForm();
      formSuccess.textContent = '평가가 등록됐어요. 소중한 의견 고마워요!';
    } catch (err) {
      // 서버(또는 가짜 서버)가 보낸 메시지를 그대로 보여 준다. 예: "욕설이나 비방 표현은 등록할 수 없어요."
      formError.innerHTML = errorHtml(err.message);
    } finally {
      // 성공하든 실패하든 "보내는 중" 상태는 끝낸다
      submitting = false;
      submitButton.textContent = '평가 등록';
      updateRatingUi();
    }
  });
}

// ================= 시작 =================

function start() {
  // 주소에 메뉴 번호가 없으면 (예: menu.html 만 열었을 때)
  if (!menuId) {
    renderError(stateBox, '메뉴 번호가 없어요. 오늘의 메뉴에서 평가할 메뉴를 골라 주세요.');
    return;
  }

  buildTagSelectors();
  setupForm();
  resetForm();

  loadData(stateBox, () => getMenuReviews(menuId), (data) => {
    menu = data;
    stateBox.innerHTML = ''; // "불러오는 중" 지우기
    content.hidden = false; // 숨겨 둔 내용 보여 주기
    document.title = `${data.name} 평가 · MealMeter`; // 브라우저 탭 제목
    renderSummary();
    renderReviews();
  }, '평가를 불러오는 중이에요');
}

start();
