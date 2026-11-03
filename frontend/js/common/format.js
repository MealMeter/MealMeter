// 역할: 여러 페이지가 같이 쓰는 작은 도구 함수 (글자 안전하게 바꾸기, 날짜 보기 좋게 바꾸기). 담당: 김근영

// 사용자가 쓴 글(의견, 메뉴 이름 등)을 HTML에 넣기 전에 꼭 이 함수를 거친다.
// 예: 누가 의견에 "<script>"를 쓰면 진짜 코드로 실행될 수 있는데, 이 함수가 그냥 글자로 바꿔 준다.
// [문법] export function: 다른 파일에서 import { escapeHtml } 로 가져다 쓸 수 있게 내보내는 함수 선언
export function escapeHtml(text) {
  // [문법] const map = { 키: 값 }: 객체. 위험한 글자(키)를 안전한 HTML 표현(값)으로 바꾸는 표
  // [문법] '&amp;' 같은 것은 HTML 엔티티: 브라우저가 코드로 해석하지 않고 그 글자(&)로만 보여 준다
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  // [문법] text ?? '': 널 병합 연산자. text가 null/undefined면 빈 글자를 쓴다
  // [문법] String(...): 숫자 등 무엇이 와도 문자열로 바꾼다
  // [문법] 문자열.replace(/[&<>"']/g, 함수): 정규식에 맞는 글자를 함수가 돌려준 값으로 바꾼다
  // [문법]   /[...]/ = 대괄호 안 글자 중 하나, g = global(처음 한 개가 아니라 전부)
  // [문법] (char) => map[char]: 찾은 글자 char를 표에서 꺼낸 값으로 바꾸는 화살표 함수. map[char]는 대괄호로 키를 꺼내는 문법
  return String(text ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

// "2026-10-26" → "10월 26일 월요일"
// [문법] dateText: "2026-10-26" 같은 YYYY-MM-DD 문자열을 받는다
export function formatDate(dateText) {
  // [문법] dateText.split('-'): '-'를 기준으로 잘라 배열로 → ['2026', '10', '26']
  // [문법] .map(Number): 각 글자를 숫자로 바꾼다 → [2026, 10, 26]. Number 함수를 그대로 넘겼다
  // [문법] const [year, month, day] = 배열: 배열 구조 분해. 순서대로 꺼내 변수 3개에 담는다
  const [year, month, day] = dateText.split('-').map(Number);
  // new Date("2026-10-26")는 시간대 때문에 하루가 밀릴 수 있어서, 숫자로 나눠서 만든다
  // [문법] new Date(연, 월, 일): 날짜 객체를 만든다. 월은 0부터 시작해서(0 = 1월) month - 1을 넘긴다
  // [문법] .toLocaleDateString('ko-KR', 옵션): 한국어 날짜 글자로 바꾼다. 옵션 객체로 어떤 부분을 어떻게 보여 줄지 정한다
  // [문법]   month: 'long' → '10월', day: 'numeric' → '26일', weekday: 'long' → '월요일'
  return new Date(year, month - 1, day).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// "2026-10-26T03:30:00.000Z" → "10월 26일 오후 12:30"
// [문법] isoText: "2026-10-26T03:30:00.000Z" 같은 ISO 시각 문자열(Z = 세계 표준시)
export function formatDateTime(isoText) {
  // [문법] new Date(ISO 문자열): 문자열을 날짜·시각 객체로 바꾼다. 화면에 보일 때는 내 컴퓨터 시간대(한국)로 바뀐다
  // [문법] .toLocaleString: 날짜와 시각을 함께 글자로. hour: 'numeric' → '오후 12시', minute: '2-digit' → 항상 두 자리('05')
  return new Date(isoText).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
