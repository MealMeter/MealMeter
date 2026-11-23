// ============================================================================
// 📄 format.js — 여러 페이지가 같이 쓰는 "글자 다듬기" 도구                       담당: 김근영
// ============================================================================
//
// 📦 이 파일이 내보내는 것
//   escapeHtml('<b>안녕</b>')                  → '&lt;b&gt;안녕&lt;/b&gt;'  (HTML 코드가 실행되지 않게)
//   formatDate('2026-10-26')                   → '10월 26일 월요일'
//   formatDateTime('2026-10-26T03:30:00.000Z') → '10월 26일 오후 12:30'
// ============================================================================

// ----------------------------------------------------------------------------
// escapeHtml(text) — 글자를 HTML에 넣어도 안전하게 바꾼다  ⭐ 보안에 아주 중요!
//
//   🤔 왜 필요할까? (XSS 공격 막기)
//     우리는 화면을 `<p>${의견}</p>` 처럼 글자로 HTML을 만들어서 innerHTML에 넣는다.
//     그런데 누가 의견에 <script>나쁜코드</script> 를 적으면, 브라우저는 그걸 "글자"가 아니라
//     "진짜 HTML 코드"로 알아듣고 실행해 버린다. → 다른 사람 화면에서 나쁜 코드가 돌아간다!
//
//   🛡️ 해결 방법
//     HTML에서 특별한 뜻을 가진 글자 5개를 "그 글자 모양만 보여 주는 표현"으로 바꾼다.
//       &  →  &amp;        <  →  &lt;        >  →  &gt;
//       "  →  &quot;       '  →  &#39;
//     그러면 브라우저는 화면에 < 모양만 보여 주고, 태그로 해석하지 않는다.
//
//   📌 규칙: 사용자가 쓴 글이나 서버에서 온 글(메뉴 이름, 의견 등)을 HTML 글자에 넣을 땐 무조건 이 함수를 거친다!
//
//   예) escapeHtml('<script>')  → '&lt;script&gt;'   (화면에는 <script> 글자 그대로 보임)
//       escapeHtml(null)        → ''
//       escapeHtml(42)          → '42'
// ----------------------------------------------------------------------------
// [문법] export function: 다른 파일에서 import { escapeHtml } 로 가져다 쓸 수 있게 내보내는 함수
export function escapeHtml(text) {
  // 값이 아예 없으면(null, undefined) 빈 글자를 돌려준다 (안 그러면 화면에 'null'이라고 찍힌다)
  if (text === null || text === undefined) return '';

  // 숫자 같은 게 와도 글자로 바꿔 둔다 (숫자에는 replaceAll이 없어서)
  // [문법] String(42) → '42'
  let result = String(text);

  // 위험한 글자를 하나씩 안전한 표현으로 바꾼다
  // [문법] 문자열.replaceAll('찾을글자', '바꿀글자'): 찾은 글자를 "전부" 바꾼 새 글자를 돌려준다
  // ⚠️ & 를 반드시 맨 먼저 바꿔야 한다!
  //    만약 < 를 먼저 &lt; 로 바꾼 뒤에 & 를 바꾸면, &lt; 의 & 까지 또 바뀌어서 &amp;lt; 가 되어 버린다.
  result = result.replaceAll('&', '&amp;');
  result = result.replaceAll('<', '&lt;');
  result = result.replaceAll('>', '&gt;');
  result = result.replaceAll('"', '&quot;'); // 속성 값 "..." 를 빠져나가지 못하게
  result = result.replaceAll("'", '&#39;'); // 속성 값 '...' 를 빠져나가지 못하게
  return result;
}

// ----------------------------------------------------------------------------
// formatDate(dateText) — 서버 날짜를 사람이 읽기 좋은 한국어로
//
//   예) formatDate('2026-10-26') → '10월 26일 월요일'
// ----------------------------------------------------------------------------
export function formatDate(dateText) {
  // '2026-10-26'을 '-' 기준으로 잘라 연·월·일 숫자를 꺼낸다
  // [문법] split('-'): '-'를 기준으로 잘라 배열로 → ['2026', '10', '26']
  const parts = dateText.split('-');
  const year = Number(parts[0]); // 2026
  const month = Number(parts[1]); // 10
  const day = Number(parts[2]); // 26

  // 🤔 왜 new Date('2026-10-26')을 바로 안 쓸까?
  //    그렇게 쓰면 브라우저가 "세계 표준시 자정"으로 읽어서, 시간대에 따라 하루 전 날짜로 보일 수 있다.
  //    숫자로 나눠서 new Date(연, 월, 일)로 만들면 "내 컴퓨터 시간대의 그날"이 되어 안전하다.
  // [문법] new Date(연, 월, 일): 날짜 객체를 만든다.
  //        ⚠️ 월은 0부터 센다(0 = 1월, 9 = 10월)! 그래서 month - 1 을 넘긴다
  // [문법] .toLocaleDateString('ko-KR', 옵션): 한국어 날짜 글자로 바꾼다. 옵션으로 보여 줄 부분을 고른다
  //        month: 'long' → '10월',  day: 'numeric' → '26일',  weekday: 'long' → '월요일'
  return new Date(year, month - 1, day).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

// ----------------------------------------------------------------------------
// formatDateTime(isoText) — 평가 작성 시각을 한국 시간 글자로
//
//   예) formatDateTime('2026-10-26T03:30:00.000Z') → '10월 26일 오후 12:30'
//       (끝의 Z = 세계 표준시. 한국은 9시간 빠르니까 03:30 → 12:30 이 된다)
// ----------------------------------------------------------------------------
export function formatDateTime(isoText) {
  // [문법] new Date(ISO 글자): 글자를 날짜·시각 객체로 바꾼다. 보여 줄 때는 내 컴퓨터 시간대(한국)로 바뀐다
  // [문법] .toLocaleString: 날짜와 시각을 함께 글자로
  //        hour: 'numeric' → '오후 12',  minute: '2-digit' → 분을 항상 두 자리('05')로
  return new Date(isoText).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
