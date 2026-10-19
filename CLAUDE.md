# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MealMeter: students rate school lunch anonymously (no login). Korean UI. Three features: today's menu, review/feedback per menu, popularity ranking. Monorepo with `frontend/` (React + Vite + React Router, plain JS/JSX) and `backend/` (FastAPI + SQLite, Python 3.9+).

## Commands

Frontend (run in `frontend/`): `npm install`, `npm run dev` (http://localhost:5173), `npm run build`. No frontend linter or tests.
- Mock vs real server: `src/api/index.js` uses the in-memory mock (`src/api/mock.js`) unless `VITE_USE_MOCK=false` (set in `frontend/.env.local`, see `.env.example`). Vite proxies `/api` to `http://localhost:8080`.

Backend (run in `backend/`):
- Setup: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Run: `.venv/bin/uvicorn app.main:app --reload --port 8080` (interactive docs at `/docs`)
- Test: `.venv/bin/python -m pytest`; single test: `.venv/bin/python -m pytest tests/test_api.py::test_ranking_groups_by_name`

## Architecture

- **API contract is the boundary.** Pages never call `fetch` or write URLs. They call the four functions in `src/api/index.js` (`getTodayMenus`, `getMenuReviews`, `createReview`, `getRanking`), whose JSDoc defines the response shapes. The mock must return the same shapes as the real server. On failure the server sends `{ message }` and `client.js` throws `Error(message)`; the UI shows that message as-is.
- `src/api/reviewFields.js` is the single source for tag categories and options (간/양/온도/식감 + separate 위생), the comment max length, and meal codes. The form, review list, ranking badges and mock all read from it.
- `src/api/useApi.js`: the `{ data, loading, error, setData, reload }` hook every page uses with the `components/state/` parts (Loading, ErrorMessage, EmptyState).
- Routing in `src/App.jsx`: every route is nested under `components/layout/Layout.jsx` (header with `NavLink` + `<Outlet />`).
- Ranking groups reviews by menu **name** across days (a menuId is one dish on one date) and sorts by average rating. How to handle menus with very few reviews is still undecided (TODO in `mock.js` and `RankingTable.jsx`).
- Profanity filtering is the server's job (`backend/app/rules.py`). The mock imitates it with a word list.
- Backend: `app/routers/` has one module per API group. `app/schemas.py` uses a camelCase alias generator, so Python uses `menu_id` while JSON uses `menuId`. Every error, including validation errors, is turned into `{ "message": ... }` in `app/main.py`. Review validation happens in the router so the messages can be in Korean. `rules.py` mirrors `frontend/src/api/reviewFields.js`, so change both together.
- Today's menu: `ensure_menus` fetches dishes from the NEIS meal API (`app/neis.py`, 대전 G10 / school 7430310) the first time a date and meal is requested, strips allergy codes, and stores them in SQLite. `fetched_meals` records which date and meal pairs are cached. `MEALMETER_TODAY` in `backend/.env` pins "today" for demos. Tests monkeypatch `neis.fetch_dishes`, `config.today` and `config.DB_PATH`, so they never hit the network.

## Conventions

- Styling: plain CSS. Design tokens live in `src/styles/tokens.css` (`var(--color-…)`, `--space-…`). Page-specific CSS sits next to the page, with class names prefixed by the page or component (e.g. `.menu-detail`, `.review-form__…`).
- Each folder has one owner (see README.md). `App.jsx` and `api/` belong to 박준호, `styles/` and `components/ui/` to 김태건, and `components/state/` to 조현우. The usage (props) of shared components is documented in a comment at the top of each file. Keep it updated when props change.
- Accessibility is part of the spec: tags are never distinguished by color alone (always show a text label), forms use `fieldset`/`legend`, everything is keyboard-operable, and live messages use `role="alert"`/`role="status"`.
- Code comments and user-facing text are in Korean.
- Git: work on `feature/<kebab-name>` branches, merge to `main` via PR only, never force-push.
