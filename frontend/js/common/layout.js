// 역할: 모든 페이지 위아래에 공통 틀(본문 건너뛰기 링크 + 헤더 + 푸터)을 그려 넣는다. 담당: 김근영
// 모든 HTML 파일에 <script type="module" src="/js/common/layout.js"></script> 한 줄만 넣으면 된다.
// 헤더 메뉴를 바꾸고 싶으면 이 파일의 NAV_ITEMS만 고치면 모든 페이지에 한 번에 반영된다.
//
// [문법] `//` 로 시작하는 줄은 "한 줄 주석"이다. 브라우저는 이 줄을 실행하지 않고 건너뛴다.
// [문법] 이 파일은 HTML에서 type="module"로 불러오므로 "ES 모듈"이다.
//        모듈은 자동으로 엄격 모드(strict mode)로 실행되고, 페이지 HTML을 다 읽은 뒤(defer처럼) 실행된다.
//        그래서 아래에서 document.body를 바로 써도 body가 이미 존재한다.

// 메뉴 링크 목록. paths: 이 주소들에 있을 때 "지금 페이지"로 표시한다 (메뉴 상세는 오늘의 메뉴에 속한다)
// [문법] const: 다시 대입할 수 없는 변수를 만든다. (배열 안의 내용은 바꿀 수 있지만, NAV_ITEMS = ... 처럼 새로 넣을 수는 없다)
// [문법] [ ... ]: 배열(여러 값을 순서대로 담는 목록). 값 사이는 쉼표(,)로 나눈다.
// [문법] { 키: 값, ... }: 객체(이름표가 붙은 값 묶음). item.href 처럼 점(.)으로 꺼내 쓴다.
// [문법] 마지막 요소 뒤의 쉼표(trailing comma)는 허용된다. 줄을 추가할 때 diff가 깔끔해진다.
const NAV_ITEMS = [
  // href: 눌렀을 때 갈 주소 / label: 화면에 보일 글자 / paths: "현재 페이지"로 볼 주소 목록(문자열 배열)
  { href: '/', label: '오늘의 메뉴', paths: ['/', '/index.html', '/menu.html', '/menu'] },
  { href: '/ranking.html', label: '인기 순위', paths: ['/ranking.html', '/ranking'] },
];

// 로고 그림 (접시 위 계기판 바늘)
// [문법] 백틱(`)으로 감싼 글자는 "템플릿 리터럴"이다. 여러 줄을 그대로 쓸 수 있고, ${식} 자리에 값을 끼워 넣을 수 있다.
// [SVG] <svg>: 벡터 그림. viewBox="0 0 34 34" → 가로 34, 세로 34 좌표계로 그린다(실제 크기는 CSS가 정함).
// [SVG] aria-hidden="true": 장식용 그림이라 화면 낭독기가 읽지 않게 한다.
// [SVG] <circle cx cy r>: 중심 (cx, cy), 반지름 r인 원. fill=채움 색, stroke=테두리 색, stroke-width=테두리 두께.
// [SVG] stroke-opacity="0.35": 테두리를 35%만 보이게(반투명).
// [SVG] <path d="...">: 선을 그리는 명령. M x y = 펜을 (x,y)로 이동, A rx ry 회전 큰호 방향 x y = 원호, L x y = 직선.
// [SVG] stroke-linecap="round": 선 끝을 둥글게.
const LOGO_SVG = `
  <svg class="site-logo" aria-hidden="true" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="#D9480F"></circle>
    <circle cx="17" cy="17" r="11.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.5"></circle>
    <path d="M9 21 A8 8 0 0 1 25 21" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"></path>
    <path d="M17 21 L21.5 14.5" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path>
    <circle cx="17" cy="21" r="2.2" fill="#FFFFFF"></circle>
  </svg>`;

// [문법] function 이름() { ... }: 함수 선언. 이름을 불러야(renderLayout()) 안의 코드가 실행된다.
function renderLayout() {
  // [문법] window.location.pathname: 지금 주소에서 도메인 뒤의 경로 부분. 예) http://localhost:5173/ranking.html → '/ranking.html'
  const currentPath = window.location.pathname;

  // [문법] 배열.map(함수): 배열의 요소 하나하나에 함수를 실행해, 그 결과들로 "새 배열"을 만든다.
  // [문법] (item) => { ... }: 화살표 함수. function(item) { ... }을 짧게 쓴 것. item에 배열 요소가 하나씩 들어온다.
  const links = NAV_ITEMS.map((item) => {
    // aria-current="page": 화면 낭독기가 "현재 페이지"라고 읽어 주고, CSS도 이걸 보고 강조한다
    // [문법] 배열.includes(값): 배열 안에 그 값이 있으면 true, 없으면 false.
    // [문법] 조건 ? A : B: 삼항 연산자. 조건이 true면 A, false면 B가 된다.
    const current = item.paths.includes(currentPath) ? ' aria-current="page"' : '';
    // [문법] return: 함수의 결과값을 돌려주고 함수를 끝낸다. 여기서는 <li> 한 줄짜리 HTML 글자를 돌려준다.
    // [문법] ${item.href}: 템플릿 리터럴 안에 변수 값을 끼워 넣는다.
    return `<li><a class="site-header__link" href="${item.href}"${current}>${item.label}</a></li>`;
    // [문법] .join(''): 배열 요소들을 사이에 아무것도 넣지 않고('') 하나의 문자열로 이어 붙인다.
    // [문법] 메서드 체이닝: map(...)의 결과(배열)에 바로 .join(...)을 이어서 호출했다.
  }).join('');

  // body 맨 앞에 건너뛰기 링크 + 헤더를 넣는다
  // [문법] document.body: 지금 페이지의 <body> 요소.
  // [문법] 요소.insertAdjacentHTML(위치, HTML문자열): 문자열을 HTML로 해석해서 지정 위치에 끼워 넣는다.
  //        'afterbegin' = 요소 안쪽 맨 앞, 'beforeend' = 요소 안쪽 맨 뒤.
  //        기존 내용을 지우지 않는다는 점이 innerHTML(통째로 바꿈)과 다르다.
  // [HTML] 아래 문자열 내용 설명:
  //   <a class="skip-link" href="#main">: 키보드 사용자가 메뉴를 건너뛰고 id="main"(본문)으로 바로 가는 링크.
  //   <header>: 페이지 머리 영역이라는 뜻의 의미 태그.
  //   aria-label="...": 눈에 보이지 않는 이름. 로고 링크를 낭독기가 "MealMeter 오늘의 메뉴로 가기"라고 읽는다.
  //   <span aria-hidden="true">MealMeter</span>: 화면에는 보이지만 낭독기는 aria-label을 대신 읽으므로 숨긴다.
  //   <nav aria-label="주요 메뉴">: 이동 메뉴 묶음. 이름을 붙여 푸터의 "보조 메뉴"와 구분한다.
  //   <ul>/<li>: 순서 없는 목록. ${links} 자리에 위에서 만든 <li>들이 들어간다.
  //   ${LOGO_SVG}: 위의 로고 SVG 문자열이 그대로 들어간다.
  // [문법] 함수 인자 목록 끝의 쉼표(trailing comma)도 허용된다.
  document.body.insertAdjacentHTML(
    'afterbegin',
    `
    <a class="skip-link" href="#main">본문 바로가기</a>
    <header class="site-header">
      <div class="site-header__inner">
        <a class="site-header__logo" href="/" aria-label="MealMeter 오늘의 메뉴로 가기">
          ${LOGO_SVG}<span aria-hidden="true">MealMeter</span>
        </a>
        <nav class="site-header__nav" aria-label="주요 메뉴">
          <ul class="site-header__list">${links}</ul>
        </nav>
      </div>
    </header>
    `,
  );

  // body 맨 뒤에 푸터를 넣는다
  // [HTML] <footer>: 페이지 꼬리 영역 의미 태그. <p>: 문단.
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <footer class="site-footer">
      <div class="site-footer__inner">
        <p>MealMeter · 우리 학교 급식 평가</p>
      </div>
    </footer>
    `,
  );
}

// [문법] 함수 호출. 이 파일이 실행되자마자 위에서 만든 renderLayout 함수를 한 번 실행한다.
renderLayout();
