# Hockey Tournament Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready static React application for following independent men's and women's ice hockey tournaments through editable TypeScript data.

**Architecture:** Static tournament definitions live under `src/data` and conform to domain types in `src/types`. Pure utilities calculate standings, format Ushuaia dates, and select the initial timeline target; React components only render those results and manage persisted navigation state. Vite produces a repository-relative static build deployed by GitHub Actions to GitHub Pages.

**Tech Stack:** React 19, Vite, TypeScript, CSS Modules, Vitest, Testing Library, ESLint, GitHub Actions

---

## File Structure

- `src/types/tournament.ts`: domain types shared by data, utilities, and UI.
- `src/data/teams.ts`: editable team records.
- `src/data/matches.ts`: editable schedule, statuses, scores, and playoff placeholders.
- `src/data/tournamentConfig.ts`: scoring, qualification, labels, and timezone configuration.
- `src/utils/standings.ts`: pure standings calculation and deterministic sorting.
- `src/utils/matches.ts`: match grouping and initial-scroll target selection.
- `src/utils/date.ts`: Spanish date/time formatting in the configured timezone.
- `src/components/*`: focused controls, timeline cards, and standings table.
- `src/App.tsx`: persisted tournament/view state and application composition.
- `src/styles/*`: global tokens and component-local responsive styling.
- `.github/workflows/deploy.yml`: GitHub Pages build and deployment.
- `README.md`: maintenance and deployment instructions.

### Task 1: Bootstrap the Toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `eslint.config.js`
- Create: `index.html`
- Create: `src/main.tsx`

- [ ] Add React/Vite scripts for `dev`, `build`, `typecheck`, `lint`, `test`, and `preview`.
- [ ] Install the pinned dependencies from the lockfile.
- [ ] Verify the empty application typechecks before feature work.

### Task 2: Model and Seed Tournament Data

**Files:**
- Create: `src/types/tournament.ts`
- Create: `src/data/teams.ts`
- Create: `src/data/matches.ts`
- Create: `src/data/tournamentConfig.ts`

- [ ] Define categories, statuses, stages, score nullability, placeholder participants, scoring rules, and qualification bands.
- [ ] Add all specified men's and women's teams with category-unique IDs.
- [ ] Add chronological sample schedules containing finished, live, upcoming, and playoff matches.
- [ ] Mark regular-season matches as standings-eligible and playoff matches as excluded.
- [ ] Centralize display labels, timezone, scoring, and qualification configuration.

### Task 3: Implement Standings with Tests

**Files:**
- Create: `src/utils/standings.ts`
- Create: `src/utils/standings.test.ts`

- [ ] Write tests for win/loss, draw, 0–0, missing scores, ignored playoffs, category separation, points ordering, goal-difference ordering, and goals-for ordering.
- [ ] Run the tests and verify they fail because the utility is absent.
- [ ] Implement zero-initialized rows, strict match eligibility, configurable points, and deterministic sorting.
- [ ] Run the standings test suite and verify every case passes.

### Task 4: Implement Timeline Utilities with Tests

**Files:**
- Create: `src/utils/matches.ts`
- Create: `src/utils/matches.test.ts`
- Create: `src/utils/date.ts`

- [ ] Test target priority: first live, then first upcoming, then final chronological match.
- [ ] Test match grouping preserves chronological day and match order.
- [ ] Implement stable date sorting, grouping, and target selection.
- [ ] Implement Spanish Ushuaia date and time formatters using `Intl.DateTimeFormat`.

### Task 5: Build the Mobile-First Interface

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/SegmentedControl.tsx`
- Create: `src/components/MatchTimeline.tsx`
- Create: `src/components/MatchCard.tsx`
- Create: `src/components/StandingsTable.tsx`
- Create: `src/components/QualificationLegend.tsx`
- Create: `src/styles/global.css`
- Create: `src/styles/App.module.css`
- Create: `src/components/*.module.css`

- [ ] Build explicit men's/women's and matches/standings segmented controls with large touch targets and ARIA state.
- [ ] Persist both choices in local storage with validated fallbacks.
- [ ] Render chronological day groups, real teams, playoff placeholders, statuses, stages, venue, notes, and null-safe scores.
- [ ] Auto-scroll once per tournament selection to the utility-selected match without forcing subsequent user scrolling.
- [ ] Render automatically calculated standings and category-specific qualification bands.
- [ ] Add a centered single-column shell, strong live/upcoming hierarchy, subdued results, and a horizontally scrollable accessible table.

### Task 6: Configure GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`

- [ ] Set Vite's production base to a repository-relative `./` so assets work at any `github.io/<repo>/` path.
- [ ] Add a Pages workflow using `actions/configure-pages`, artifact upload, and deployment with least-privilege permissions.
- [ ] Ensure the workflow runs lint, typecheck, tests, and build before uploading `dist`.

### Task 7: Document Maintenance

**Files:**
- Create: `README.md`

- [ ] Document install, development, validation, build, preview, and Pages deployment.
- [ ] Give concrete TypeScript examples for adding a team and match.
- [ ] Explain score/status updates, null versus zero, playoff placeholders, standings eligibility, and tournament configuration.
- [ ] Identify all seeded results and schedules as sample data requiring replacement.

### Task 8: Validate and Review

**Files:**
- Modify: any files implicated by validation failures.

- [ ] Run `npm run lint` and fix every diagnostic.
- [ ] Run `npm run typecheck` and fix every diagnostic.
- [ ] Run `npm test -- --run` and fix every failure.
- [ ] Run `npm run build` and verify the production output.
- [ ] Inspect the final diff for hardcoded tournament data, cross-category leakage, null-score mistakes, accessibility regressions, and GitHub Pages path issues.
