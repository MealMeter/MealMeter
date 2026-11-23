// ============================================================================
// 📄 ui.js — 여러 페이지에서 쓰는 작은 화면 부품을 "HTML 글자"로 만들어 주는 공장  담당: 김근영
// ============================================================================
//
// 🧱 비유로 이해하기
//   레고 블록처럼, 별점·태그 배지·버튼 같은 작은 부품을 여기서 찍어 낸다.
//   함수를 부르면 HTML "글자"가 나오고, 페이지는 그 글자를 자기 HTML 사이에 끼워 넣는다.
//     예) `<li>${tagBadgeHtml('간', '짜다')}</li>`
//   이 함수들은 화면에 직접 넣지 않는다! 글자만 만들어 돌려준다. (넣는 건 쓰는 쪽이 innerHTML로)
//   스타일은 css/base.css의 "3) 공통 UI 부품"에 있다. 카드는 함수 없이 class="card"만 붙이면 된다.
//
// 📦 이 파일이 내보내는 것 (→ 화면에 보이는 모양)
//   starRatingHtml(4.2)                         → ★★★★☆ 4.2
//   starRatingHtml(5, false)                    → ★★★★★ (숫자 없이)
//   tagBadgeHtml('간', '적당')                  → [간 · 적당]
//   tagBadgeHtml('위생', '문제 있음', true)     → 눈에 띄는 빨간 경고 배지 [! 위생 문제 있음]
//   linkButtonHtml('/', '홈으로')               → 버튼 모양 링크
//   linkButtonHtml('/', '홈으로', 'secondary')  → 모양 바꾸기 ('primary' | 'secondary' | 'danger')
//   linkButtonHtml(주소, '평가하기', 'primary', '닭갈비 평가하기') → 낭독기용 이름 붙이기
//   dishIcon('소고기무국')                      → '🍲' (메뉴 이름으로 고른 장식용 그림 글자)
// ============================================================================

// 사용자가 쓴 글이 HTML 코드로 실행되지 않게 막는 함수 (format.js 참고, XSS 방지)
// [문법] import { 이름 } from './format.js': 같은 폴더(./)의 format.js가 export한 것을 가져온다
import { escapeHtml } from './format.js';

// ----------------------------------------------------------------------------
// starRatingHtml(value, showValue) — 읽기 전용 별점 (★★★★☆ 4.2)
//
//   value    : 0~5 숫자. 4.2처럼 소수도 된다 (반올림해서 별 개수를 정한다)
//   showValue: false를 넘기면 옆에 숫자를 안 보여 준다. 안 넘기면 보여 준다
//
//   예) starRatingHtml(4.2)  → ★★★★☆ 4.2   (4.2를 반올림 → 별 4개)
//       starRatingHtml(9)    → ★★★★★ 5.0   (5보다 크면 5로)
//       starRatingHtml('ㅋ') → ☆☆☆☆☆ 0.0   (숫자가 아니면 0으로)
// ----------------------------------------------------------------------------
export function starRatingHtml(value, showValue) {
  // ── 1) 점수를 0~5 사이 숫자로 맞추기 ──
  // [문법] Number(value): 값을 숫자로 바꾼다. '4.2' → 4.2, 'abc' → NaN(Not a Number = 숫자 아님)
  let score = Number(value);
  // 숫자가 아니거나 0보다 작으면 0으로
  if (Number.isNaN(score) || score < 0) score = 0;
  // 5보다 크면 5로
  if (score > 5) score = 5;

  // ── 2) 꽉 찬 별 개수 정하기 ──
  // [문법] Math.round(x): 반올림. 4.2 → 4, 4.5 → 5
  const filled = Math.round(score); // 4.2 → 별 4개

  // ── 3) 별 5개 HTML 만들기 ──
  // 빈 글자에서 시작해서 별을 하나씩 이어 붙인다
  let stars = '';
  // [문법] for (let i = 0; i < 5; i += 1): i를 0에서 시작해서 i < 5인 동안 반복, 한 번 돌 때마다 i를 1 늘린다
  //        → i = 0, 1, 2, 3, 4 로 총 5번 실행
  for (let i = 0; i < 5; i += 1) {
    // filled가 4면: i = 0,1,2,3 은 꽉 찬 별(★), i = 4 는 빈 별(☆)
    if (i < filled) {
      stars += '<span class="star-rating__star is-filled">★</span>';
    } else {
      stars += '<span class="star-rating__star">☆</span>';
    }
  }

  // ── 4) 옆에 붙일 숫자 HTML (showValue가 false가 아닐 때만) ──
  // [문법] score.toFixed(1): 소수 첫째 자리까지 글자로. 4 → '4.0', 4.25 → '4.3'
  // [HTML] aria-hidden="true": 이미 아래 aria-label로 점수를 읽어 주니까 숫자를 또 읽지 않게 숨긴다
  let valueHtml = '';
  if (showValue !== false) {
    valueHtml = `<strong class="star-rating__value" aria-hidden="true">${score.toFixed(1)}</strong>`;
  }

  // ── 5) 합쳐서 돌려주기 ──
  // role="img" + aria-label: 낭독기는 "별, 별, 별…"을 하나하나 읽지 않고 "5점 만점에 4.2점"이라고 한 번에 읽는다
  return `
    <span class="star-rating" role="img" aria-label="5점 만점에 ${score.toFixed(1)}점">
      <span class="star-rating__stars" aria-hidden="true">${stars}</span>
      ${valueHtml}
    </span>`;
}

// ----------------------------------------------------------------------------
// tagBadgeHtml(category, value, warning) — 태그 배지 ([간 · 적당])
//
//   category: 항목 이름. 예) '간'
//   value   : 고른 값.   예) '적당'
//   warning : true면 빨간 경고 배지 (위생 문제 있음 같은 경우). 안 넘기면 일반 배지
//
//   💡 접근성: 색만 보고 구분하게 만들지 않는다(색맹인 사람도 있으니까).
//              그래서 항상 "항목 이름 + 값"을 글자로 같이 보여 주고, 경고에는 '!' 표시도 붙인다.
// ----------------------------------------------------------------------------
export function tagBadgeHtml(category, value, warning) {
  if (warning) {
    // 경고 배지: 클래스 두 개(tag-badge + tag-badge--warning)를 붙이고, 앞에 장식용 '!'를 넣는다
    // [문법] return 하면 함수가 여기서 끝나므로, 아래 일반 배지 줄은 실행되지 않는다
    return `<span class="tag-badge tag-badge--warning"><span aria-hidden="true">!</span>${escapeHtml(category)} ${escapeHtml(value)}</span>`;
  }
  // 일반 배지: "간 · 적당" 모양
  return `<span class="tag-badge">${escapeHtml(category)} · ${escapeHtml(value)}</span>`;
}

// ----------------------------------------------------------------------------
// linkButtonHtml(href, label, variant, ariaLabel) — 버튼처럼 생긴 링크
//
//   href     : 눌렀을 때 갈 주소. 예) '/'
//   label    : 버튼에 보이는 글자. 예) '오늘의 메뉴 평가하러 가기'
//   variant  : 모양. 'primary'(기본, 진한 색) | 'secondary'(연한 색) | 'danger'(빨간색)
//   ariaLabel: 낭독기가 대신 읽을 이름. "평가하기" 버튼이 여러 개일 때
//              "닭갈비 평가하기", "김치 평가하기"처럼 구분해 주려고 쓴다. 필요 없으면 안 넘긴다
//
//   🤔 왜 <button>이 아니라 <a>일까?
//     다른 페이지로 "이동"하는 건 링크(<a>)가 맞다. 모양만 버튼처럼 꾸몄을 뿐이다.
// ----------------------------------------------------------------------------
export function linkButtonHtml(href, label, variant, ariaLabel) {
  // 모양을 안 정했으면 기본 모양
  if (!variant) {
    variant = 'primary';
  }
  // ariaLabel이 있으면 ' aria-label="..."' 속성 글자를 만들고, 없으면 빈 글자(속성 없음)
  let aria = '';
  if (ariaLabel) {
    aria = ` aria-label="${escapeHtml(ariaLabel)}"`;
  }
  // class="btn btn--${variant}": variant에 따라 btn--primary / btn--secondary / btn--danger 클래스가 된다
  return `<a class="btn btn--${variant}" href="${escapeHtml(href)}"${aria}>${escapeHtml(label)}</a>`;
}

// ----------------------------------------------------------------------------
// 메뉴 그림 규칙표 — 메뉴 이름에 어떤 글자가 들어 있으면 어떤 그림을 붙일지
//
//   ⚠️ 위에서부터 순서대로 검사해서 "처음 맞는 것"을 쓴다. 그래서 순서가 중요하다!
//      예) "딸기요구르트"는 딸기(디저트)와 요구르트(음료) 둘 다 맞지만, 음료 줄이 위에 있어서 🥛가 된다.
//
// [문법] 객체 배열: 각 칸이 { pattern: 정규식, icon: 그림 } 모양이다
// [문법] 정규식 /.../ 읽는 법:
//   |  : "또는".       /우유|주스/ → '우유' 또는 '주스'가 들어 있으면 맞음
//   $  : "글자의 끝".  /국$/ → '국'으로 끝나는 이름만 (미역국 ✅, 국수 ❌)
//   배$ → '배'로 끝나는 것만 (배 ✅, 배추김치 ❌). 떡$, 탕$, 전$ 도 같은 원리
// ----------------------------------------------------------------------------
const DISH_ICONS = [
  { pattern: /우유|주스|요구르트|요거트|에이드|음료|라떼/, icon: '🥛' }, // 음료
  { pattern: /푸딩|케이크|과일|사과|배$|귤|수박|딸기|바나나|아이스|빵|쿠키|브레드|떡$/, icon: '🍮' }, // 디저트·과일
  { pattern: /김치|깍두기|섞박지|단무지|피클/, icon: '🥬' }, // 김치·절임
  { pattern: /국$|탕$|찌개|국밥|스프|수프/, icon: '🍲' }, // 국물
  { pattern: /면|국수|우동|짜장|짬뽕|파스타|스파게티/, icon: '🍜' }, // 면
  { pattern: /밥|라이스|덮밥|죽/, icon: '🍚' }, // 밥
  { pattern: /샐러드|나물|무침|쌈/, icon: '🥗' }, // 채소 반찬
  { pattern: /까스|가스|튀김|너겟|가라아게|강정|치킨|전$/, icon: '🍗' }, // 튀김
  { pattern: /볶음|구이|불고기|갈비|제육|고기|스테이크|조림|찜/, icon: '🍖' }, // 고기·볶음
];

// ----------------------------------------------------------------------------
// dishIcon(name) — 메뉴 이름에 어울리는 장식용 그림 글자를 고른다
//
//   예) dishIcon('소고기무국') → '🍲'   ('국'으로 끝남)
//       dishIcon('돈까스')     → '🍗'   ('까스' 포함)
//       dishIcon('요상한메뉴') → '🍽️'  (아무것도 안 맞으면 기본 접시)
//
//   💡 장식일 뿐이라 화면에서는 aria-hidden 자리에 넣어 낭독기가 읽지 않게 한다.
// ----------------------------------------------------------------------------
export function dishIcon(name) {
  // 규칙표를 위에서부터 하나씩 검사한다
  for (const item of DISH_ICONS) {
    // [문법] 정규식.test(글자): 글자가 패턴에 맞으면 true
    if (item.pattern.test(name)) {
      // 처음 맞는 규칙을 찾으면 바로 그 그림을 돌려주고 끝 (아래 규칙은 안 본다)
      return item.icon;
    }
  }
  // 하나도 안 맞으면 기본 접시
  return '🍽️';
}
