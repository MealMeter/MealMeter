# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MealMeter: students rate school lunch anonymously (no login). Korean UI. Three features: today's menu, review/feedback per menu, popularity ranking. This repo is the frontend only (`frontend/`): plain HTML + CSS + vanilla JS (ES modules), no React or framework. Vite is used only as the dev server/bundler. The backend (FastAPI + SQLite) lives in a separate repo, MealMeter/MealMeter-BE.

## Commands

Frontend (run in `frontend/`): `npm install`, `npm run dev` (http://localhost:5173), `npm run build`. No linter or tests.
- Mock vs real server: `js/api/index.js` uses the mock (`js/api/mock.js`, persisted in localStorage key `mealmeter-mock-reviews-v2`) unless `VITE_USE_MOCK=false` (set in `frontend/.env.local`, see `.env.example`). Vite proxies `/api` to `http://localhost:8080`. Optional `VITE_NEIS_API_KEY` raises the NEIS daily call limit (it is public in the browser).

Backend: see the MealMeter-BE repo (runs on port 8080).

## Architecture

- **Multi-page app.** One HTML file per page: `index.html` (today's menu), `menu.html?menuId=N&meal=M` (review form + list; `meal` is optional), `ranking.html`, `guide.html` (static), `404.html`. Each page loads `css/base.css` + its own CSS, then `js/common/layout.js` (injects skip link, header nav, footer) and its own `js/pages/<page>.js`. `vite.config.js` uses `appType: 'mpa'`, lists pages in `PAGES` for the build, and serves `404.html` for unknown routes in dev. All asset paths are absolute (`/css/…`, `/js/…`).
- **API contract is the boundary.** Page scripts never call `fetch` or write URLs. They call the functions in `js/api/index.js` (`getTodayMenus`, `getMenuReviews`, `createReview`, `getRanking` → our server; `getMealInfo(date)` → NEIS), whose JSDoc defines the response shapes. The mock must return the same shapes as the real server. On failure the server sends `{ message }` and `client.js` throws `Error(message)`; the UI shows that message as-is.
- **NEIS is called from the browser** (`js/api/neis.js`, CORS allowed) only for calories, nutrients and allergies, which the backend drops. Menu IDs and reviews always come from the backend. Dishes are matched by name, so `cleanDishName` must stay identical to `clean_dish_name` in MealMeter-BE `app/neis.py`. NEIS failure must never block rating (pages hide that info instead).
- The main page loads all three meals at once (`getTodayMenus(1|2|3)`) for the meal tabs and today's TOP 3. Clicking a star there creates a rating-only review immediately; rated menus are remembered in localStorage `mealmeter-quick-ratings`.
- `js/api/reviewFields.js` is the single source for tag categories and options (간/양/온도/식감 + separate 위생), the comment max length, and meal codes. It is mirrored by `app/rules.py` in MealMeter-BE, so change both together.
- Rendering is template strings + `innerHTML`. **Any server/user text must go through `escapeHtml` (`js/common/format.js`)** before being put in HTML.
- `js/common/state.js`: `loadData(container, fetcher, onSuccess, loadingMessage)` handles loading → success / error with retry; plus `renderLoading`, `renderError`, `renderEmpty`, `errorHtml`. `js/common/ui.js`: `starRatingHtml`, `tagBadgeHtml`, `linkButtonHtml`, `dishIcon`; cards are just `class="card"`.
- Ranking groups reviews by menu **name** across days (a menuId is one dish on one date) and sorts by average rating. How to handle menus with very few reviews is still undecided (TODO in `mock.js` and `js/pages/ranking.js`).
- Profanity filtering is the server's job (`app/rules.py` in MealMeter-BE). The mock imitates it with a word list.

## Conventions

- Styling: plain CSS. Design tokens live in `css/tokens.css` (`var(--color-…)`, `--space-…`); don't hard-code colors or sizes elsewhere. Page CSS is `css/<page>.css`, with class names prefixed by the page or component (e.g. `.menu-detail`, `.review-form__…`).
- Ownership (see README.md): `js/api/`, `js/common/layout.js`, `js/common/format.js`, `vite.config.js`, menu page → 박준호; `css/tokens.css`, `js/common/ui.js`, main page → 김태건; `js/common/state.js`, guide and 404 pages → 김근영; ranking page, accessibility/QA → 조현우. Usage of shared functions is documented in a comment at the top of each file. Keep it updated when signatures change.
- Accessibility is part of the spec: tags are never distinguished by color alone (always show a text label), forms use `fieldset`/`legend`, everything is keyboard-operable, and live messages use `role="alert"`/`role="status"`.
- Code comments and user-facing text are in Korean.
- Git: work on `feature/<kebab-name>` branches, merge via PR only, never force-push.
