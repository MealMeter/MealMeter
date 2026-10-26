// 역할: 모든 페이지 위아래에 공통 틀(본문 건너뛰기 링크 + 헤더 + 푸터)을 그려 넣는다. 담당: 박준호
// 모든 HTML 파일에 <script type="module" src="/js/common/layout.js"></script> 한 줄만 넣으면 된다.
// 헤더 메뉴를 바꾸고 싶으면 이 파일의 NAV_ITEMS만 고치면 모든 페이지에 한 번에 반영된다.

// 메뉴 링크 목록. paths: 이 주소들에 있을 때 "지금 페이지"로 표시한다
const NAV_ITEMS = [
  { href: '/', label: '오늘의 메뉴', paths: ['/', '/index.html'] },
  { href: '/ranking.html', label: '인기 순위', paths: ['/ranking.html', '/ranking'] },
  { href: '/guide.html', label: '이용 안내', paths: ['/guide.html', '/guide'] },
];

function renderLayout() {
  const currentPath = window.location.pathname;

  const links = NAV_ITEMS.map((item) => {
    // aria-current="page": 화면 낭독기가 "현재 페이지"라고 읽어 주고, CSS도 이걸 보고 굵게 표시한다
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
        <a class="site-header__logo" href="/">MealMeter</a>
        <nav aria-label="주요 메뉴">
          <ul class="site-header__nav">${links}</ul>
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
      <p>MealMeter · 이름 없이 남긴 평가로 더 나은 급식을 만들어요</p>
    </footer>
    `,
  );
}

renderLayout();
