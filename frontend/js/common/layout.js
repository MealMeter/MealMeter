// 역할: 모든 페이지 위아래에 공통 틀(본문 건너뛰기 링크 + 헤더 + 푸터)을 그려 넣는다. 담당: 김태건
// 모든 HTML 파일에 <script type="module" src="/js/common/layout.js"></script> 한 줄만 넣으면 된다.
// 헤더 메뉴를 바꾸고 싶으면 이 파일의 NAV_ITEMS만 고치면 모든 페이지에 한 번에 반영된다.

// 메뉴 링크 목록. paths: 이 주소들에 있을 때 "지금 페이지"로 표시한다 (메뉴 상세는 오늘의 메뉴에 속한다)
const NAV_ITEMS = [
  { href: '/', label: '오늘의 메뉴', paths: ['/', '/index.html', '/menu.html', '/menu'] },
  { href: '/ranking.html', label: '인기 순위', paths: ['/ranking.html', '/ranking'] },
  { href: '/guide.html', label: '이용 안내', paths: ['/guide.html', '/guide'] },
];

// 로고 그림 (접시 위 계기판 바늘). guide.html에도 같은 그림이 크게 들어 있다
const LOGO_SVG = `
  <svg class="site-logo" aria-hidden="true" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="#D9480F"></circle>
    <circle cx="17" cy="17" r="11.5" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.5"></circle>
    <path d="M9 21 A8 8 0 0 1 25 21" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"></path>
    <path d="M17 21 L21.5 14.5" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"></path>
    <circle cx="17" cy="21" r="2.2" fill="#FFFFFF"></circle>
  </svg>`;

function renderLayout() {
  const currentPath = window.location.pathname;

  const links = NAV_ITEMS.map((item) => {
    // aria-current="page": 화면 낭독기가 "현재 페이지"라고 읽어 주고, CSS도 이걸 보고 강조한다
    const current = item.paths.includes(currentPath) ? ' aria-current="page"' : '';
    return `<li><a class="site-header__link" href="${item.href}"${current}>${item.label}</a></li>`;
  }).join('');

  // body 맨 앞에 건너뛰기 링크 + 헤더를 넣는다
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
  document.body.insertAdjacentHTML(
    'beforeend',
    `
    <footer class="site-footer">
      <div class="site-footer__inner">
        <p>MealMeter · 우리 학교 급식 평가</p>
        <nav aria-label="보조 메뉴">
          <a class="site-footer__link" href="/guide.html">이용 안내</a>
        </nav>
      </div>
    </footer>
    `,
  );
}

renderLayout();
