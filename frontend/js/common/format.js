// 역할: 여러 페이지가 같이 쓰는 작은 도구 함수 (글자 안전하게 바꾸기, 날짜 보기 좋게 바꾸기). 담당: 김근영

// 사용자가 쓴 글(의견, 메뉴 이름 등)을 HTML에 넣기 전에 꼭 이 함수를 거친다.
// 예: 누가 의견에 "<script>"를 쓰면 진짜 코드로 실행될 수 있는데, 이 함수가 그냥 글자로 바꿔 준다.
// [문법] export function: 다른 파일에서 import { escapeHtml } 로 가져다 쓸 수 있게 내보내는 함수 선언
export function escapeHtml(text) {
  // 값이 없으면(null, undefined) 빈 글자
  if (text === null || text === undefined) return '';
  // [문법] String(값): 숫자 등 무엇이 와도 문자열로 바꾼다
  let result = String(text);
  // [문법] 문자열.replaceAll(찾을글자, 바꿀글자): 찾은 글자를 전부 바꾼다
  // [문법] '&amp;' 같은 것은 HTML 엔티티: 브라우저가 코드로 해석하지 않고 그 글자(&)로만 보여 준다
  // & 를 맨 먼저 바꿔야 한다 (나중에 바꾸면 '&lt;'의 & 까지 또 바뀐다)
  result = result.replaceAll('&', '&amp;');
  result = result.replaceAll('<', '&lt;');
  result = result.replaceAll('>', '&gt;');
  result = result.replaceAll('"', '&quot;');
  result = result.replaceAll("'", '&#39;');
  return result;
}

// "2026-10-26" → "10월 26일 월요일"
export function formatDate(dateText) {
  // [문법] split('-'): '-'를 기준으로 잘라 배열로 → ['2026', '10', '26']
  const parts = dateText.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  // new Date("2026-10-26")는 시간대 때문에 하루가 밀릴 수 있어서, 숫자로 나눠서 만든다
  // [문법] new Date(연, 월, 일): 날짜 객체를 만든다. 월은 0부터 시작해서(0 = 1월) month - 1을 넘긴다
  // [문법] .toLocaleDateString('ko-KR', 옵션): 한국어 날짜 글자로 바꾼다
  // [문법]   month: 'long' → '10월', day: 'numeric' → '26일', weekday: 'long' → '월요일'
  return new Date(year, month - 1, day).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// "2026-10-26T03:30:00.000Z" → "10월 26일 오후 12:30"
export function formatDateTime(isoText) {
  // [문법] new Date(ISO 문자열): 문자열을 날짜·시각 객체로 바꾼다. 화면에 보일 때는 내 컴퓨터 시간대(한국)로 바뀐다
  // [문법] .toLocaleString: 날짜와 시각을 함께 글자로. minute: '2-digit' → 항상 두 자리('05')
  return new Date(isoText).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
