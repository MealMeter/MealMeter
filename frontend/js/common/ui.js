// 역할: 공통 UI 부품을 HTML 글자로 만들어 주는 함수 모음 (별점 표시, 태그 배지, 링크 버튼, 메뉴 그림 글자). 담당: 김근영
// 스타일은 css/base.css의 "3) 공통 UI 부품"에 있다. 카드는 함수 없이 class="card"만 붙이면 된다.
//
// starRatingHtml(4.2)                       → ★★★★☆ 4.2
// starRatingHtml(5, { showValue: false })   → ★★★★★
// tagBadgeHtml('간', '적당')                → [간 · 적당]
// tagBadgeHtml('위생', '문제 있음', true)   → 눈에 띄는 경고 배지
// linkButtonHtml('/', '홈으로')             → 버튼 모양 링크 (variant: 'primary' | 'secondary' | 'danger')
// dishIcon('소고기무국')                    → '🍲' (메뉴 이름으로 고른 장식용 그림 글자)
//
// [문법] import { 이름 } from '경로': 다른 모듈 파일이 export한 것을 가져와 이 파일에서 쓴다.
//        { } 안에는 가져올 이름을 정확히 쓴다(이름 있는 내보내기 = named import). './'는 "이 파일과 같은 폴더".
// escapeHtml: <, >, &, " 같은 글자를 안전한 글자(&lt; 등)로 바꿔, 사용자가 쓴 글이 HTML 코드로 실행되지 않게 한다(XSS 방지).
import { escapeHtml } from './format.js';

// 읽기 전용 별점 표시. value는 0~5 숫자 (4.2처럼 소수도 된다)
// [문법] export: 이 함수를 다른 파일에서 import 할 수 있게 내보낸다.
// [문법] value = 0: 기본 매개변수. 값을 안 넘기면(undefined) 0이 된다.
// [문법] { showValue = true } = {}: 객체 구조 분해 + 기본값.
//        두 번째 인자로 받은 객체에서 showValue 속성을 꺼내 변수로 만들고, 없으면 true를 쓴다.
//        뒤의 = {}는 두 번째 인자 자체를 아예 안 넘겼을 때 빈 객체로 대신한다는 뜻이다(안 그러면 오류).
export function starRatingHtml(value = 0, { showValue = true } = {}) {
  // [문법] Number(value): 값을 숫자로 바꾼다. '4.2' → 4.2, 'abc' → NaN(숫자 아님).
  // [문법] A || B: A가 거짓 같은 값(0, NaN, '', null, undefined, false)이면 B를 쓴다. 여기서는 NaN이면 0.
  // [문법] Math.max(0, x): 둘 중 큰 값 → 0보다 작아지지 않게. Math.min(5, x): 둘 중 작은 값 → 5보다 커지지 않게.
  const score = Math.min(5, Math.max(0, Number(value) || 0)); // 0~5 사이로 맞춘다
  // [문법] Math.round(x): 반올림. 4.2 → 4, 4.5 → 5.
  const filled = Math.round(score); // 4.2 → 별 4개

  // [문법] let: 나중에 값을 바꿀 수 있는 변수. 아래 반복문에서 계속 이어 붙이므로 const가 아니라 let.
  let stars = '';
  // [문법] for (시작; 조건; 증가) { ... }: 반복문. i = 0에서 시작해 i < 5인 동안 실행하고, 한 번 돌 때마다 i를 1 늘린다.
  // [문법] i += 1: i = i + 1 과 같다.
  for (let i = 0; i < 5; i += 1) {
    // [문법] stars += '글자': stars 뒤에 글자를 이어 붙인다(stars = stars + '글자').
    // [문법] 조건 ? A : B: i가 채울 개수보다 작으면 꽉 찬 별(★), 아니면 빈 별(☆).
    stars += i < filled
      ? '<span class="star-rating__star is-filled">★</span>'
      : '<span class="star-rating__star">☆</span>';
  }

  // role="img" + aria-label: 화면 낭독기는 별 5개를 하나하나 읽지 않고 "5점 만점에 4.2점"이라고 읽는다
  // [문법] score.toFixed(1): 소수 첫째 자리까지 글자로 바꾼다. 4 → '4.0', 4.25 → '4.3'.
  // [문법] ${showValue ? `...` : ''}: 템플릿 리터럴 안에 또 템플릿 리터럴을 넣었다(중첩). showValue가 false면 빈 글자.
  // [HTML] <strong>: 중요한 글자(굵게). aria-hidden="true": 이미 aria-label로 읽었으니 숫자를 또 읽지 않게 숨긴다.
  return `
    <span class="star-rating" role="img" aria-label="5점 만점에 ${score.toFixed(1)}점">
      <span class="star-rating__stars" aria-hidden="true">${stars}</span>
      ${showValue ? `<strong class="star-rating__value" aria-hidden="true">${score.toFixed(1)}</strong>` : ''}
    </span>`;
}

// 색만으로 구분하지 않도록 항목 이름과 값을 글자로 함께 보여 준다
// [문법] warning = false: 세 번째 인자를 안 넘기면 false(일반 배지).
export function tagBadgeHtml(category, value, warning = false) {
  // [문법] if (조건) { ... }: 조건이 true일 때만 중괄호 안을 실행한다.
  if (warning) {
    // 경고 배지: 클래스 두 개(tag-badge + tag-badge--warning)를 붙이고, 앞에 장식용 '!'를 넣는다.
    // escapeHtml(...)로 감싸서 카테고리·값에 HTML 코드가 섞여 있어도 글자로만 보이게 한다.
    // [문법] return 하면 함수가 여기서 끝나므로, 아래 일반 배지 줄은 실행되지 않는다.
    return `<span class="tag-badge tag-badge--warning"><span aria-hidden="true">!</span>${escapeHtml(category)} ${escapeHtml(value)}</span>`;
  }
  // warning이 false일 때만 여기까지 온다. "간 · 적당" 모양의 일반 배지.
  return `<span class="tag-badge">${escapeHtml(category)} · ${escapeHtml(value)}</span>`;
}

// 링크(<a>)인데 모양은 버튼. ariaLabel: 같은 글자 버튼이 여러 개일 때 구분용 (예: "닭갈비 평가하기")
// [문법] { variant = 'primary', ariaLabel } = {}: 옵션 객체 구조 분해. variant는 기본값 'primary', ariaLabel은 기본값 없음(undefined).
export function linkButtonHtml(href, label, { variant = 'primary', ariaLabel } = {}) {
  // ariaLabel이 있으면 ' aria-label="..."' 속성 글자를 만들고, 없으면 빈 글자.
  // [문법] undefined나 ''는 조건에서 거짓으로 취급된다(falsy).
  const aria = ariaLabel ? ` aria-label="${escapeHtml(ariaLabel)}"` : '';
  // class="btn btn--${variant}": variant 값에 따라 btn--primary / btn--secondary / btn--danger 클래스가 된다.
  return `<a class="btn btn--${variant}" href="${escapeHtml(href)}"${aria}>${escapeHtml(label)}</a>`;
}

// 메뉴 이름을 보고 장식용 그림 글자를 고른다. 화면 낭독기에는 읽히지 않게 aria-hidden 자리에 쓴다.
// 위에서부터 먼저 맞는 것을 쓴다 (예: "딸기요구르트"는 음료가 디저트보다 먼저)
// [문법] 2차원 배열: [ [정규식, 그림], [정규식, 그림], ... ] 처럼 배열 안에 배열이 들어 있다.
// [문법] /.../: 정규 표현식(글자 패턴). 슬래시 사이가 패턴이다.
//   |   : "또는". /우유|주스/ → '우유' 또는 '주스'가 들어 있으면 맞음.
//   $   : "글자의 끝". /국$/ → '국'으로 끝나는 이름만(예: '미역국'은 맞고 '국수'는 안 맞음).
//   배$ → '배'로 끝나는 것만(예: '배'는 맞지만 '배추김치'는 안 맞음). 떡$, 탕$, 전$ 도 같은 원리.
const DISH_ICONS = [
  [/우유|주스|요구르트|요거트|에이드|음료|라떼/, '🥛'],
  [/푸딩|케이크|과일|사과|배$|귤|수박|딸기|바나나|아이스|빵|쿠키|브레드|떡$/, '🍮'],
  [/김치|깍두기|섞박지|단무지|피클/, '🥬'],
  [/국$|탕$|찌개|국밥|스프|수프/, '🍲'],
  [/면|국수|우동|짜장|짬뽕|파스타|스파게티/, '🍜'],
  [/밥|라이스|덮밥|죽/, '🍚'],
  [/샐러드|나물|무침|쌈/, '🥗'],
  [/까스|가스|튀김|너겟|가라아게|강정|치킨|전$/, '🍗'],
  [/볶음|구이|불고기|갈비|제육|고기|스테이크|조림|찜/, '🍖'],
];

// 위 목록에서 이름이 처음 맞는 그림을 돌려준다. 하나도 안 맞으면 기본 접시 🍽️
export function dishIcon(name) {
  // [문법] 배열.find(함수): 함수가 true를 돌려주는 "첫 번째" 요소를 돌려준다. 하나도 없으면 undefined.
  // [문법] ([pattern]) => ...: 배열 구조 분해. 요소 [정규식, 그림] 중 첫 번째(정규식)만 pattern이라는 이름으로 꺼낸다.
  // [문법] 정규식.test(글자): 글자가 패턴에 맞으면 true.
  // [문법] ?.[1]: 옵셔널 체이닝. find 결과가 undefined면 오류 없이 undefined를 돌려주고, 있으면 [1](그림)을 꺼낸다.
  // [문법] A ?? B: 널 병합 연산자. A가 null 또는 undefined일 때만 B를 쓴다(|| 와 달리 0이나 ''는 그대로 둔다).
  return DISH_ICONS.find(([pattern]) => pattern.test(name))?.[1] ?? '🍽️';
}
