// 역할: 상태 표시 부품 (불러오는 중 / 오류 / 빈 화면) + 서버 데이터 불러오기 도우미. 담당: 김근영
// 스타일은 css/base.css의 "4) 상태 표시"에 있다.
//
// renderLoading(상자, '순위를 불러오는 중이에요')   → 상자 안에 "불러오는 중" 표시 (role="status")
// renderError(상자, '오류 메시지', 다시시도함수)     → 오류 표시 (role="alert"), 함수를 주면 "다시 시도" 버튼이 생긴다
// renderEmpty(상자, '오늘은 급식 정보가 없어요', 추가HTML) → 빈 화면 (아래에 버튼 등 추가 가능)
// errorHtml('오류 메시지')                         → 폼 근처에 넣을 작은 오류 상자 HTML
// loadData(상자, 불러올함수, 성공하면할일, 안내문구) → 불러오는 중 → 성공/오류를 알아서 처리
import { escapeHtml } from './format.js';

export function renderLoading(container, message = '불러오는 중이에요…') {
  container.innerHTML = `
    <div class="state-box" role="status">
      <span class="state-box__spinner" aria-hidden="true"></span>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

export function renderError(container, message, onRetry) {
  container.innerHTML = `
    <div class="state-box state-box--error" role="alert">
      <span class="state-box__icon" aria-hidden="true">⚠️</span>
      <p>${escapeHtml(message)}</p>
      ${onRetry ? '<button type="button" class="btn btn--secondary state-box__retry">다시 시도</button>' : ''}
    </div>`;
  // "다시 시도" 버튼을 누르면 받은 함수를 실행한다
  if (onRetry) container.querySelector('.state-box__retry').addEventListener('click', onRetry);
}

export function renderEmpty(container, message, extraHtml = '') {
  container.innerHTML = `
    <div class="state-box">
      <span class="state-box__icon" aria-hidden="true">🍽️</span>
      <p>${escapeHtml(message)}</p>
      ${extraHtml}
    </div>`;
}

// 폼 안에 넣는 작은 오류 상자 (예: "욕설이나 비방 표현은 등록할 수 없어요.")
export function errorHtml(message) {
  return `<div class="state-box state-box--error state-box--inline" role="alert"><span aria-hidden="true">⚠️</span><p>${escapeHtml(message)}</p></div>`;
}

// 서버에서 데이터를 불러오는 공통 흐름.
// 1) 상자에 "불러오는 중" 표시 → 2) 성공하면 onSuccess(데이터) 실행 → 3) 실패하면 오류 + "다시 시도" 버튼
export async function loadData(container, fetcher, onSuccess, loadingMessage) {
  renderLoading(container, loadingMessage);
  let data;
  try {
    data = await fetcher();
  } catch (err) {
    // 서버가 보낸 한 줄 메시지를 그대로 보여 준다. 다시 시도를 누르면 이 함수를 처음부터 다시 실행한다
    renderError(container, err.message, () => loadData(container, fetcher, onSuccess, loadingMessage));
    return;
  }
  onSuccess(data);
}
