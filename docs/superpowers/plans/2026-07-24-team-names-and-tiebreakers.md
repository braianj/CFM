# Team Names and Tiebreakers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the six men's teams and implement head-to-head standings tiebreakers for two-team and three-team points ties.

**Architecture:** Team IDs remain stable while their display names change, preserving every existing match reference. The pure standings utility will build the normal table, group rows by total points, and resolve groups of two using their direct match or groups of three using an internal mini-table.

**Tech Stack:** React, TypeScript, Vitest

---

### Task 1: Lock Team Identity with Tests

**Files:**
- Create: `src/data/teams.test.ts`
- Modify: `src/data/teams.ts`

- [ ] Assert the exact men's names are `CAU Blanco`, `CAU Verde`, `CAU Negro`, `ACEMHH`, `Alpacas`, and `LOS ÑIRES`.
- [ ] Assert the three CAU teams have three unique stable IDs.
- [ ] Rename only the men's team display values and short names while preserving IDs and match references.
- [ ] Run `npm test -- --run src/data/teams.test.ts` and expect all team tests to pass.

### Task 2: Specify Head-to-Head Ordering

**Files:**
- Modify: `src/utils/standings.test.ts`

- [ ] Add a two-team tie where overall goal difference favors one team but the direct-match winner ranks first.
- [ ] Add the three-team cycle `A 3–1 B`, `B 2–0 C`, and `C 1–0 A`, expecting `A`, `B`, `C`.
- [ ] Add equal wins against a fourth team with a large external score for C, expecting the mini-table order to remain `A`, `B`, `C`.
- [ ] Run `npm test -- --run src/utils/standings.test.ts` and verify the new cases fail under global goal-difference ordering.

### Task 3: Implement Group Tiebreakers

**Files:**
- Modify: `src/utils/standings.ts`

- [ ] Retain only finished, scored, standings-eligible matches in a reusable result list.
- [ ] Group calculated rows by total points before sorting.
- [ ] For two rows, calculate points from matches between those team IDs and sort the direct-match winner first.
- [ ] For three rows, calculate mini-table points, goals for, goals against, and goal difference using only matches whose two participants belong to that group.
- [ ] Use overall goal difference, overall goals for, and alphabetical order only when the requested head-to-head rules do not resolve the group.
- [ ] Run the complete unit suite and expect every existing and new test to pass.

### Task 4: Validate and Publish

**Files:**
- Modify only files implicated by validation failures.

- [ ] Run `npm run lint`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm run build`.
- [ ] Confirm the diff contains no unrelated UI or data changes.
- [ ] Commit, push, and monitor the GitHub Pages workflow to completion.
