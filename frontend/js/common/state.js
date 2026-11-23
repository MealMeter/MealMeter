// 역할: 상태 표시 부품 (불러오는 중 / 오류 / 빈 화면) + 서버 데이터 불러오기 도우미. 담당: 김근영
// 스타일은 css/base.css의 "4) 상태 표시"에 있다.
//
// renderLoading(상자, '순위를 불러오는 중이에요')   → 상자 안에 "불러오는 중" 표시 (role="status")
// renderError(상자, '오류 메시지', 다시시도함수)     → 오류 표시 (role="alert"), 함수를 주면 "다시 시도" 버튼이 생긴다
// renderEmpty(상자, '오늘은 급식 정보가 없어요', 추가HTML) → 빈 화면 (아래에 버튼 등 추가 가능)
// errorHtml('오류 메시지')                         → 폼 근처에 넣을 작은 오류 상자 HTML
// loadData(상자, 불러올함수, 성공하면할일, 안내문구) → 불러오는 중 → 성공/오류를 알아서 처리
//
// [문법] import { escapeHtml } from './format.js': 같은 폴더 format.js에서 escapeHtml 함수를 가져온다.
//        메시지 글자에 HTML 코드가 섞여 있어도 실행되지 않고 글자로만 보이게 하려고 쓴다.
import { escapeHtml } from './format.js';

// [문법] export function: 다른 파일에서 import 해서 쓸 수 있게 내보내는 함수.
// [문법] container: HTML 요소(예: document.querySelector('#list')로 찾은 상자)를 받는다.
// 메시지를 안 넘기면 '불러오는 중이에요…'를 쓴다.
export function renderLoading(container, message) {
  // [문법] 인자를 안 넘기면 undefined라서 !message 가 true가 된다
  if (!message) {
    message = '불러오는 중이에요…';
  }
  // [문법] 요소.innerHTML = 'HTML 글자': 요소 안의 내용을 통째로 이 HTML로 바꾼다(기존 내용은 사라진다).
  // [HTML] role="status": 낭독기가 하던 말을 끝낸 뒤 이 글을 조용히 읽어 준다(중요도 낮은 실시간 알림).
  // [HTML] state-box__spinner: CSS로 빙글빙글 도는 원. 장식이라 aria-hidden="true".
  container.innerHTML = `
    <div class="state-box" role="status">
      <span class="state-box__spinner" aria-hidden="true"></span>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

// [문법] onRetry: 함수를 값으로 받는다(콜백 함수). 안 넘기면 undefined.
export function renderError(container, message, onRetry) {
  // [HTML] role="alert": 낭독기가 하던 말을 끊고 바로 읽어 주는 중요한 알림.
  // [HTML] <button type="button">: 폼을 제출하지 않는 일반 버튼(type을 안 쓰면 폼 안에서 submit이 된다).
  // 다시 시도 함수가 있을 때만 버튼을 넣는다.
  let retryButton = '';
  if (onRetry) {
    retryButton = '<button type="button" class="btn btn--secondary state-box__retry">다시 시도</button>';
  }
  // [HTML] ⚠️ 그림은 장식이라 aria-hidden="true".
  container.innerHTML = `
    <div class="state-box state-box--error" role="alert">
      <span class="state-box__icon" aria-hidden="true">⚠️</span>
      <p>${escapeHtml(message)}</p>
      ${retryButton}
    </div>`;
  // "다시 시도" 버튼을 누르면 받은 함수를 실행한다
  // [문법] 요소.querySelector('.클래스'): 요소 안에서 CSS 선택자에 맞는 첫 번째 요소를 찾는다(점(.)은 클래스).
  // [문법] 요소.addEventListener('click', 함수): 그 요소를 클릭할 때마다 함수를 실행하도록 등록한다.
  if (onRetry) {
    container.querySelector('.state-box__retry').addEventListener('click', onRetry);
  }
}

// 추가 HTML을 안 넘기면 빈 글자를 쓴다.
export function renderEmpty(container, message, extraHtml) {
  if (!extraHtml) {
    extraHtml = '';
  }
  // 빈 화면: 접시 그림 + 메시지 + (있다면) 추가 HTML(예: "다른 날짜 보기" 버튼).
  // extraHtml은 코드에서 직접 만든 HTML이라 escapeHtml을 쓰지 않는다(쓰면 버튼이 글자로 보여 버린다).
  container.innerHTML = `
    <div class="state-box">
      <span class="state-box__icon" aria-hidden="true">🍽️</span>
      <p>${escapeHtml(message)}</p>
      ${extraHtml}
    </div>`;
}

// 폼 안에 넣는 작은 오류 상자 (예: "욕설이나 비방 표현은 등록할 수 없어요.")
// 위 함수들과 달리 상자에 직접 넣지 않고 "HTML 글자"만 돌려준다. 쓰는 쪽에서 원하는 자리에 넣는다.
// [HTML] state-box--inline: 가로 한 줄 모양의 작은 오류 상자(CSS 4번 구역).
export function errorHtml(message) {
  return `<div class="state-box state-box--error state-box--inline" role="alert"><span aria-hidden="true">⚠️</span><p>${escapeHtml(message)}</p></div>`;
}

// 서버에서 데이터를 불러오는 공통 흐름.
// 1) 상자에 "불러오는 중" 표시 → 2) 성공하면 onSuccess(데이터) 실행 → 3) 실패하면 오류 + "다시 시도" 버튼
// [문법] async function: 비동기 함수. 안에서 await를 쓸 수 있고, 호출하면 Promise(나중에 끝나는 작업)를 돌려준다.
// [문법] fetcher: 데이터를 불러오는 함수(예: getRanking). onSuccess: 데이터를 받아 화면을 그리는 함수.
export async function loadData(container, fetcher, onSuccess, loadingMessage) {
  // 먼저 "불러오는 중" 표시. loadingMessage가 undefined면 renderLoading의 기본 문구가 쓰인다.
  renderLoading(container, loadingMessage);
  // [문법] let data;: 값 없이 변수만 먼저 만든다(undefined). try 블록 밖에서도 쓰려고 여기서 선언한다.
  let data;
  // [문법] try { ... } catch (err) { ... }: try 안에서 오류가 나면 멈추지 않고 catch로 넘어간다. err에 오류 정보가 들어온다.
  try {
    // [문법] await: Promise가 끝날 때(서버 응답이 올 때)까지 기다렸다가 결과값을 꺼낸다. 실패하면 오류를 던진다(→ catch).
    data = await fetcher();
  } catch (err) {
    // 서버가 보낸 한 줄 메시지를 그대로 보여 준다. 다시 시도를 누르면 이 함수를 처음부터 다시 실행한다
    // [문법] err.message: 오류 객체(Error)에 담긴 메시지 글자.
    // [문법] function () { ... }: 이름 없는 함수. 지금 바로 실행하지 않고, 버튼을 누를 때 실행할 함수로 넘긴다.
    //        함수가 자기 자신(loadData)을 다시 부르므로 "재귀 호출" 형태다.
    renderError(container, err.message, function () {
      loadData(container, fetcher, onSuccess, loadingMessage);
    });
    // [문법] return;: 값 없이 함수를 끝낸다. 실패했으니 아래 onSuccess를 실행하지 않는다.
    return;
  }
  // 성공했을 때만 여기까지 온다. 받은 데이터를 넘겨 화면을 그리게 한다.
  onSuccess(data);
}
