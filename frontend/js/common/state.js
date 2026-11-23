// ============================================================================
// 📄 state.js — "지금 어떤 상태인지" 보여 주는 화면 부품 + 데이터 불러오기 도우미  담당: 김근영
// ============================================================================
//
// 🤔 "상태 표시"가 뭘까?
//   서버에서 데이터를 받아 오는 동안 화면은 셋 중 하나의 상태가 된다.
//     ⏳ 불러오는 중   → 빙글빙글 + "불러오는 중이에요…"
//     ⚠️ 오류          → 무엇이 잘못됐는지 + [다시 시도] 버튼
//     🍽️ 비어 있음     → "아직 평가가 없어요" 같은 안내
//   이 세 화면을 페이지마다 따로 만들면 모양이 제각각이 되니까, 여기서 한 번만 만들어 같이 쓴다.
//   (스타일은 css/base.css의 "4) 상태 표시"에 있다)
//
// 📦 이 파일이 내보내는 것
//   renderLoading(상자, '순위를 불러오는 중이에요')         → 상자 안에 "불러오는 중" 표시 (role="status")
//   renderError(상자, '오류 메시지', 다시시도함수)           → 오류 표시 (role="alert"), 함수를 주면 "다시 시도" 버튼이 생긴다
//   renderEmpty(상자, '오늘은 급식 정보가 없어요', 추가HTML) → 빈 화면 (아래에 버튼 등 추가 가능)
//   errorHtml('오류 메시지')                                 → 폼 근처에 넣을 작은 오류 상자 HTML 글자
//   loadData(상자, 불러올함수, 성공하면할일, 안내문구)       → 불러오는 중 → 성공/오류를 알아서 처리 ⭐
//
// 💡 "상자(container)"란?
//   내용을 채워 넣을 HTML 요소. 예) const box = document.getElementById('ranking-content');
//   이 파일의 함수들은 그 상자 안의 내용을 통째로 갈아 끼운다.
//
// 💡 화면 낭독기(스크린 리더)란?
//   눈이 불편한 사람을 위해 화면 글자를 소리로 읽어 주는 프로그램.
//   role="status" / role="alert" 를 붙이면 내용이 바뀔 때 낭독기가 알아서 읽어 준다.
// ============================================================================

// 메시지에 HTML 코드가 섞여 있어도 실행되지 않고 글자로만 보이게 하려고 가져온다 (format.js 참고)
// [문법] import { 이름 } from './format.js': 같은 폴더 format.js에서 escapeHtml 함수를 가져온다
import { escapeHtml } from './format.js';

// ----------------------------------------------------------------------------
// renderLoading(container, message) — ⏳ "불러오는 중" 화면
//
//   container: 내용을 채울 상자(HTML 요소)
//   message  : 보여 줄 문구. 안 넘기면 '불러오는 중이에요…'
//   예) renderLoading(box, '순위를 불러오는 중이에요');
// ----------------------------------------------------------------------------
// [문법] export function: 다른 파일에서 import 해서 쓸 수 있게 내보내는 함수
export function renderLoading(container, message) {
  // 문구를 안 넘겼으면 기본 문구를 쓴다
  // [문법] 인자를 안 넘기면 undefined라서 !message 가 true가 된다
  if (!message) {
    message = '불러오는 중이에요…';
  }
  // 상자 안을 "빙글빙글 + 문구"로 통째로 바꾼다
  // [문법] 요소.innerHTML = 'HTML 글자': 요소 안의 내용을 통째로 이 HTML로 바꾼다(기존 내용은 사라진다)
  // [HTML] role="status": 낭독기가 하던 말을 끝낸 뒤 이 글을 조용히 읽어 준다(급하지 않은 알림)
  // [HTML] state-box__spinner: CSS로 빙글빙글 도는 원. 장식이라 aria-hidden="true"(낭독기가 안 읽음)
  container.innerHTML = `
    <div class="state-box" role="status">
      <span class="state-box__spinner" aria-hidden="true"></span>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

// ----------------------------------------------------------------------------
// renderError(container, message, onRetry) — ⚠️ 오류 화면 (+ 다시 시도 버튼)
//
//   container: 내용을 채울 상자
//   message  : 보여 줄 오류 문구 (보통 서버가 보낸 err.message 그대로)
//   onRetry  : [다시 시도]를 누르면 실행할 함수. 안 넘기면 버튼이 안 생긴다
//   예) renderError(box, '서버에 연결하지 못했어요.', function () { 다시불러오기(); });
// ----------------------------------------------------------------------------
// [문법] onRetry처럼 "함수를 값으로 받는 것"을 콜백 함수라고 한다. 지금 실행하지 않고 나중에(버튼 누를 때) 실행한다
export function renderError(container, message, onRetry) {
  // 다시 시도 함수가 있을 때만 버튼 HTML을 준비한다. 없으면 빈 글자(= 버튼 없음)
  // [HTML] <button type="button">: 폼을 제출하지 않는 일반 버튼(type을 안 쓰면 폼 안에서 "제출" 버튼이 되어 버린다)
  let retryButton = '';
  if (onRetry) {
    retryButton = '<button type="button" class="btn btn--secondary state-box__retry">다시 시도</button>';
  }
  // 상자 안을 "경고 그림 + 오류 문구 + (버튼)"으로 바꾼다
  // [HTML] role="alert": 낭독기가 하던 말을 끊고 바로 읽어 주는 중요한 알림
  // [HTML] ⚠️ 그림은 장식이라 aria-hidden="true"
  container.innerHTML = `
    <div class="state-box state-box--error" role="alert">
      <span class="state-box__icon" aria-hidden="true">⚠️</span>
      <p>${escapeHtml(message)}</p>
      ${retryButton}
    </div>`;
  // 방금 그린 [다시 시도] 버튼을 찾아서, 누르면 onRetry 함수가 실행되게 연결한다
  // [문법] 요소.querySelector('.클래스'): 요소 안에서 그 클래스를 가진 첫 번째 요소를 찾는다(점(.) = 클래스)
  // [문법] 요소.addEventListener('click', 함수): "이 요소를 클릭하면 이 함수를 실행해 줘"라고 등록한다
  if (onRetry) {
    container.querySelector('.state-box__retry').addEventListener('click', onRetry);
  }
}

// ----------------------------------------------------------------------------
// renderEmpty(container, message, extraHtml) — 🍽️ 빈 화면 (보여 줄 데이터가 없을 때)
//
//   container: 내용을 채울 상자
//   message  : 큰 안내 문구. 예) '아직 평가가 없어요'
//   extraHtml: 아래에 덧붙일 HTML(작은 설명, 버튼 등). 안 넘기면 없음
//   예) renderEmpty(box, '아직 순위가 없어요', '<p class="small">먼저 평가해 볼까요?</p>');
// ----------------------------------------------------------------------------
export function renderEmpty(container, message, extraHtml) {
  // 덧붙일 HTML을 안 넘겼으면 빈 글자로 (안 그러면 화면에 'undefined'라고 찍힌다)
  if (!extraHtml) {
    extraHtml = '';
  }
  // 접시 그림 + 메시지 + (있다면) 추가 HTML
  // ⚠️ extraHtml은 escapeHtml을 쓰지 않는다. 우리 코드가 직접 만든 "진짜 HTML"이라서,
  //    escapeHtml을 쓰면 버튼이 버튼이 아니라 '<button>...' 글자로 보여 버린다.
  //    (그래서 extraHtml에는 사용자가 쓴 글을 그대로 넣으면 안 된다!)
  container.innerHTML = `
    <div class="state-box">
      <span class="state-box__icon" aria-hidden="true">🍽️</span>
      <p>${escapeHtml(message)}</p>
      ${extraHtml}
    </div>`;
}

// ----------------------------------------------------------------------------
// errorHtml(message) — 폼 안에 넣는 작은 오류 상자의 "HTML 글자"를 만든다
//
//   위 함수들과 다른 점: 상자에 직접 넣지 않고 HTML 글자만 돌려준다. 쓰는 쪽에서 원하는 자리에 넣는다.
//   예) errorHtml('욕설이나 비방 표현은 등록할 수 없어요.')
//       → '<div class="state-box ... state-box--inline" role="alert">⚠️ 욕설이나...</div>'
// ----------------------------------------------------------------------------
// [HTML] state-box--inline: 가로 한 줄 모양의 작은 오류 상자(CSS 4번 구역)
export function errorHtml(message) {
  return `<div class="state-box state-box--error state-box--inline" role="alert"><span aria-hidden="true">⚠️</span><p>${escapeHtml(message)}</p></div>`;
}

// ----------------------------------------------------------------------------
// loadData(container, fetcher, onSuccess, loadingMessage) — ⭐ 서버 데이터 불러오기 "자동 처리기"
//
//   어느 페이지든 서버에서 데이터를 받아 올 땐 똑같은 순서를 밟는다:
//     1) 상자에 "불러오는 중" 표시
//     2) 서버에 요청
//     3-a) 성공 → onSuccess(받은데이터)를 불러서 화면을 그리게 한다
//     3-b) 실패 → 오류 문구 + [다시 시도] 버튼. 버튼을 누르면 1)부터 다시!
//   이 순서를 매번 쓰기 귀찮으니 이 함수가 대신 해 준다.
//
//   container     : 상태를 보여 줄 상자
//   fetcher       : 데이터를 불러오는 함수. 예) getRanking   (⚠️ 괄호 없이 함수 자체를 넘긴다)
//   onSuccess     : 데이터를 받으면 화면을 그릴 함수. 예) render
//   loadingMessage: "불러오는 중" 문구 (안 넘기면 기본 문구)
//
//   예) loadData(box, getRanking, render, '순위를 불러오는 중이에요');
//       → 불러오는 중 표시 → getRanking() 실행 → 성공하면 render(순위목록) 실행
// ----------------------------------------------------------------------------
// [문법] async function: 안에서 await(기다리기)를 쓸 수 있는 함수
export async function loadData(container, fetcher, onSuccess, loadingMessage) {
  // 1) 먼저 "불러오는 중" 표시. loadingMessage가 없으면 renderLoading이 기본 문구를 쓴다
  renderLoading(container, loadingMessage);

  // 받은 데이터를 담을 변수. try 안에서 넣고 try 밖에서 쓰려고 여기서 미리 만든다
  // [문법] let data;: 값 없이 변수만 먼저 만든다(지금은 undefined)
  let data;

  // 2) 서버에 요청
  // [문법] try { ... } catch (err) { ... }: try 안에서 오류가 나면 멈추지 않고 catch로 넘어간다. err에 오류 정보가 들어온다
  try {
    // 넘겨받은 함수를 실행하고 결과가 올 때까지 기다린다
    // [문법] fetcher(): 변수에 담긴 함수를 실행한다. await로 서버 답장을 기다린다. 실패하면 catch로!
    data = await fetcher();
  } catch (err) {
    // 3-b) 실패: 서버가 보낸 한 줄 메시지를 그대로 보여 주고, [다시 시도] 버튼을 단다
    // [문법] err.message: 오류(Error)에 담긴 메시지 글자
    // [문법] function () { ... }: 이름 없는 함수. 지금 실행하지 않고, 버튼을 누를 때 실행할 함수로 넘긴다
    //        이 함수는 loadData 자기 자신을 똑같은 재료로 다시 부른다 → 처음부터 다시 시도!
    //        (함수가 자기 자신을 부르는 것을 "재귀 호출"이라고 한다)
    renderError(container, err.message, function () {
      loadData(container, fetcher, onSuccess, loadingMessage);
    });
    // 실패했으니 아래 onSuccess는 실행하면 안 된다 → 여기서 함수 끝
    // [문법] return;: 값 없이 함수를 바로 끝낸다
    return;
  }

  // 3-a) 성공했을 때만 여기까지 온다. 받은 데이터를 넘겨 화면을 그리게 한다
  onSuccess(data);
}
