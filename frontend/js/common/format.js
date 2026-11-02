// 역할: 여러 페이지가 같이 쓰는 작은 도구 함수 (글자 안전하게 바꾸기, 날짜 보기 좋게 바꾸기). 담당: 김태건

// 사용자가 쓴 글(의견, 메뉴 이름 등)을 HTML에 넣기 전에 꼭 이 함수를 거친다.
// 예: 누가 의견에 "<script>"를 쓰면 진짜 코드로 실행될 수 있는데, 이 함수가 그냥 글자로 바꿔 준다.
export function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

// "2026-10-26" → "10월 26일 월요일"
export function formatDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  // new Date("2026-10-26")는 시간대 때문에 하루가 밀릴 수 있어서, 숫자로 나눠서 만든다
  return new Date(year, month - 1, day).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// "2026-10-26T03:30:00.000Z" → "10월 26일 오후 12:30"
export function formatDateTime(isoText) {
  return new Date(isoText).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
