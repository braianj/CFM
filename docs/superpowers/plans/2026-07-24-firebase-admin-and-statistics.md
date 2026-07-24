# Firebase Admin and Statistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free, Google-authenticated tournament administrator with Firestore-backed match, player, goal, assist, and penalty data while keeping the public site on GitHub Pages.

**Architecture:** Firebase Authentication identifies administrators and Firestore stores dynamic tournament data. The React application reads public tournament documents, falls back to bundled seed data when Firebase is unavailable, and exposes an `/admin` surface whose writes are protected by Firestore rules and an allowlisted admin document.

**Tech Stack:** React, TypeScript, Vite, Firebase Authentication, Cloud Firestore, Vitest, GitHub Pages

---

### Task 1: Configure the Firebase Project

**Files:**
- Create: `.env.example`
- Create: `firebase.json`
- Create: `firestore.rules`

- [ ] Rename the Firebase display name to `CFM Ushuaia Hockey` while preserving project ID `cfm-hockey`.
- [ ] Register a web app named `CFM Ushuaia Hockey Web`.
- [ ] Enable Google as an Authentication provider.
- [ ] Create one Firestore database on the Spark plan.
- [ ] Add `braianj.github.io` as an authorized Authentication domain.
- [ ] Record only public Firebase web configuration values in Vite environment variables.
- [ ] Define public-read rules and authenticated-admin write rules.

### Task 2: Define Dynamic Tournament Data

**Files:**
- Modify: `src/types/tournament.ts`
- Create: `src/types/statistics.ts`
- Create: `src/data/players.ts`
- Create: `src/firebase/config.ts`
- Create: `src/firebase/tournamentRepository.ts`

- [ ] Add player records with stable IDs, team IDs, numbers, and active state.
- [ ] Add match-event types for goals and penalties, including period and game time.
- [ ] Store first and second assist IDs on goal events.
- [ ] Store penalty severity, minutes, reason, player, team, period, and game time.
- [ ] Implement Firestore reads with bundled data fallback.
- [ ] Implement admin-only writes for matches, players, and match events.

### Task 3: Derive Statistics

**Files:**
- Create: `src/utils/statistics.ts`
- Create: `src/utils/statistics.test.ts`

- [ ] Test goals per player.
- [ ] Test first and second assists.
- [ ] Test total points as goals plus assists.
- [ ] Test penalties, major penalties, and penalty minutes.
- [ ] Test category and team separation.
- [ ] Implement pure event aggregation outside the UI.

### Task 4: Add Authentication and Admin UI

**Files:**
- Create: `src/firebase/auth.ts`
- Create: `src/hooks/useAuth.ts`
- Create: `src/components/admin/AdminApp.tsx`
- Create: `src/components/admin/MatchEditor.tsx`
- Create: `src/components/admin/EventEditor.tsx`
- Create: `src/components/admin/PlayerEditor.tsx`
- Create: `src/components/admin/AdminApp.module.css`
- Modify: `src/App.tsx`

- [ ] Route `/admin` without adding React Router.
- [ ] Add Google sign-in and sign-out.
- [ ] Verify the signed-in UID against the `admins` collection.
- [ ] Edit match status and nullable home/away scores.
- [ ] Create and remove goal events with up to two assists.
- [ ] Create and remove penalty events with severity and minutes.
- [ ] Create and edit player records.
- [ ] Provide clear loading, save, error, and unauthorized states.

### Task 5: Connect the Public UI

**Files:**
- Create: `src/hooks/useTournamentData.ts`
- Create: `src/components/StatisticsTable.tsx`
- Create: `src/components/StatisticsTable.module.css`
- Modify: `src/App.tsx`
- Modify: `src/components/SegmentedControl.tsx`

- [ ] Read teams, matches, players, and events from Firestore.
- [ ] Preserve the current bundled data if the remote collection is empty or unavailable.
- [ ] Add a public `Estadísticas` view.
- [ ] Show goals, assists, points, penalties, major penalties, and penalty minutes.
- [ ] Keep men's and women's data independent.

### Task 6: Seed, Secure, Validate, and Deploy

**Files:**
- Create: `scripts/seed-firestore.ts`
- Modify: `README.md`
- Modify: `.claude/CLAUDE.md`

- [ ] Seed current teams, matches, configuration, the initial admin, and any known players.
- [ ] Verify unauthenticated reads and rejected unauthenticated writes.
- [ ] Verify authenticated admin writes.
- [ ] Run lint, type checking, unit tests, and production build.
- [ ] Commit and push the exact validated source.
- [ ] Monitor GitHub Pages deployment and test the production admin login.
