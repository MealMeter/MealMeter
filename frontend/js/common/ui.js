// 역할: 공통 UI 부품을 HTML 글자로 만들어 주는 함수 모음 (별점 표시, 태그 배지, 링크 버튼, 메뉴 그림 글자). 담당: 김근영
// 스타일은 css/base.css의 "3) 공통 UI 부품"에 있다. 카드는 함수 없이 class="card"만 붙이면 된다.
//
// starRatingHtml(4.2)                         → ★★★★☆ 4.2
// starRatingHtml(5, false)                    → ★★★★★ (숫자 없이)
// tagBadgeHtml('간', '적당')                  → [간 · 적당]
// tagBadgeHtml('위생', '문제 있음', true)     → 눈에 띄는 경고 배지
// linkButtonHtml('/', '홈으로')               → 버튼 모양 링크
// linkButtonHtml('/', '홈으로', 'secondary')  → 모양 바꾸기 ('primary' | 'secondary' | 'danger')
// linkButtonHtml(주소, '평가하기', 'primary', '닭갈비 평가하기') → 낭독기용 이름 붙이기
// dishIcon('소고기무국')                      → '🍲' (메뉴 이름으로 고른 장식용 그림 글자)
//
// [문법] import { 이름 } from '경로': 다른 모듈 파일이 export한 것을 가져와 이 파일에서 쓴다. './'는 "이 파일과 같은 폴더".
// escapeHtml: <, >, &, " 같은 글자를 안전한 글자(&lt; 등)로 바꿔, 사용자가 쓴 글이 HTML 코드로 실행되지 않게 한다(XSS 방지).
import { escapeHtml } from './format.js';

// 읽기 전용 별점 표시. value는 0~5 숫자 (4.2처럼 소수도 된다)
// showValue: false를 넘기면 옆에 숫자를 안 보여 준다 (안 넘기면 보여 준다)
export function starRatingHtml(value, showValue) {
  // 0~5 사이 숫자로 맞춘다. 숫자가 아니면(NaN) 0
  // [문법] Number(value): 값을 숫자로 바꾼다. '4.2' → 4.2, 'abc' → NaN(숫자 아님).
  let score = Number(value);
  if (Number.isNaN(score) || score < 0) score = 0;
  if (score > 5) score = 5;
  // [문법] Math.round(x): 반올림. 4.2 → 4, 4.5 → 5.
  const filled = Math.round(score); // 4.2 → 별 4개

  let stars = '';
  // [문법] for (시작; 조건; 증가) { ... }: i = 0에서 시작해 i < 5인 동안 실행하고, 한 번 돌 때마다 i를 1 늘린다.
  for (let i = 0; i < 5; i += 1) {
    if (i < filled) {
      stars += '<span class="star-rating__star is-filled">★</span>';
    } else {
      stars += '<span class="star-rating__star">☆</span>';
    }
  }

  // [문법] score.toFixed(1): 소수 첫째 자리까지 글자로 바꾼다. 4 → '4.0', 4.25 → '4.3'.
  // [HTML] aria-hidden="true": 이미 aria-label로 읽었으니 숫자를 또 읽지 않게 숨긴다.
  let valueHtml = '';
  if (showValue !== false) {
    valueHtml = `<strong class="star-rating__value" aria-hidden="true">${score.toFixed(1)}</strong>`;
  }

  // role="img" + aria-label: 화면 낭독기는 별 5개를 하나하나 읽지 않고 "5점 만점에 4.2점"이라고 읽는다
  return `
    <span class="star-rating" role="img" aria-label="5점 만점에 ${score.toFixed(1)}점">
      <span class="star-rating__stars" aria-hidden="true">${stars}</span>
      ${valueHtml}
    </span>`;
}

// 색만으로 구분하지 않도록 항목 이름과 값을 글자로 함께 보여 준다
// warning: true를 넘기면 경고 배지 (안 넘기면 일반 배지)
export function tagBadgeHtml(category, value, warning) {
  if (warning) {
    // 경고 배지: 클래스 두 개(tag-badge + tag-badge--warning)를 붙이고, 앞에 장식용 '!'를 넣는다.
    // [문법] return 하면 함수가 여기서 끝나므로, 아래 일반 배지 줄은 실행되지 않는다.
    return `<span class="tag-badge tag-badge--warning"><span aria-hidden="true">!</span>${escapeHtml(category)} ${escapeHtml(value)}</span>`;
  }
  // "간 · 적당" 모양의 일반 배지.
  return `<span class="tag-badge">${escapeHtml(category)} · ${escapeHtml(value)}</span>`;
}

// 링크(<a>)인데 모양은 버튼. variant: 'primary'(기본) | 'secondary' | 'danger'
// ariaLabel: 같은 글자 버튼이 여러 개일 때 구분용 (예: "닭갈비 평가하기")
export function linkButtonHtml(href, label, variant, ariaLabel) {
  if (!variant) {
    variant = 'primary';
  }
  // ariaLabel이 있으면 ' aria-label="..."' 속성 글자를 만들고, 없으면 빈 글자.
  let aria = '';
  if (ariaLabel) {
    aria = ` aria-label="${escapeHtml(ariaLabel)}"`;
  }
  // class="btn btn--${variant}": variant 값에 따라 btn--primary / btn--secondary / btn--danger 클래스가 된다.
  return `<a class="btn btn--${variant}" href="${escapeHtml(href)}"${aria}>${escapeHtml(label)}</a>`;
}

// 메뉴 이름을 보고 장식용 그림 글자를 고른다. 화면 낭독기에는 읽히지 않게 aria-hidden 자리에 쓴다.
// 위에서부터 먼저 맞는 것을 쓴다 (예: "딸기요구르트"는 음료가 디저트보다 먼저)
// [문법] 객체 배열: 각 칸이 { pattern: 정규식, icon: 그림 } 모양이다.
// [문법] /.../: 정규 표현식(글자 패턴). 슬래시 사이가 패턴이다.
//   |   : "또는". /우유|주스/ → '우유' 또는 '주스'가 들어 있으면 맞음.
//   $   : "글자의 끝". /국$/ → '국'으로 끝나는 이름만(예: '미역국'은 맞고 '국수'는 안 맞음).
//   배$ → '배'로 끝나는 것만(예: '배'는 맞지만 '배추김치'는 안 맞음). 떡$, 탕$, 전$ 도 같은 원리.
const DISH_ICONS = [
  { pattern: /우유|주스|요구르트|요거트|에이드|음료|라떼/, icon: '🥛' },
  { pattern: /푸딩|케이크|과일|사과|배$|귤|수박|딸기|바나나|아이스|빵|쿠키|브레드|떡$/, icon: '🍮' },
  { pattern: /김치|깍두기|섞박지|단무지|피클/, icon: '🥬' },
  { pattern: /국$|탕$|찌개|국밥|스프|수프/, icon: '🍲' },
  { pattern: /면|국수|우동|짜장|짬뽕|파스타|스파게티/, icon: '🍜' },
  { pattern: /밥|라이스|덮밥|죽/, icon: '🍚' },
  { pattern: /샐러드|나물|무침|쌈/, icon: '🥗' },
  { pattern: /까스|가스|튀김|너겟|가라아게|강정|치킨|전$/, icon: '🍗' },
  { pattern: /볶음|구이|불고기|갈비|제육|고기|스테이크|조림|찜/, icon: '🍖' },
];

// 위 목록에서 이름이 처음 맞는 그림을 돌려준다. 하나도 안 맞으면 기본 접시 🍽️
export function dishIcon(name) {
  for (const item of DISH_ICONS) {
    // [문법] 정규식.test(글자): 글자가 패턴에 맞으면 true.
    if (item.pattern.test(name)) {
      return item.icon;
    }
  }
  return '🍽️';
}
