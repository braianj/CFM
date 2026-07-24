# CFM Hockey — Repository Guide

## Purpose

This repository contains the public CFM ice-hockey tournament website. It is a
React/Vite/TypeScript single-page application deployed to GitHub Pages.

Production: https://braianj.github.io/CFM/

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Before committing, all four validation commands must pass:

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
```

Pushing `main` triggers `.github/workflows/deploy.yml`, which validates and
deploys `dist` to GitHub Pages.

## Architecture

- `src/data/teams.ts`: tournament teams and stable IDs.
- `src/data/matches.ts`: schedule, scores, status and playoff placeholders.
- `src/data/tournamentConfig.ts`: scoring, timezone and qualification bands.
- `src/types/tournament.ts`: shared domain types.
- `src/utils/standings.ts`: standings and all tie-breaking business rules.
- `src/utils/matches.ts`: chronological grouping and initial scroll target.
- `src/utils/date.ts`: Spanish formatting in the Ushuaia timezone.
- `src/components`: presentation components.
- `src/App.tsx`: persisted tournament/view selection and page composition.

Business rules must remain outside React components. Tournament data must not
be hardcoded in UI files.

## Tournament Categories

Categories are independent:

- `men`
- `women`

Never mix team IDs or matches across categories.

### Men's teams

- CAU Blanco (`men-cau-1`)
- CAU Verde (`men-cau-2`)
- CAU Negro (`men-cau-3`)
- ACEMHH (`men-acemhh`)
- Alpacas (`men-allpacas`)
- LOS ÑIRES (`men-los-nires`)

The three CAU teams are separate teams. Never aggregate their results or
replace them with a generic `CAU` team.

### Women's teams

- CAU Kipas
- ACEMHH
- ALLPACAS
- LOS ÑIRES – Las Zorras

## Match Rules

Supported statuses:

- `upcoming`
- `live`
- `finished`
- `postponed`
- `tbd`

A live match may have:

- two `null` scores: display `—` and wait for results;
- two numeric scores: display the partial score.

Live partial scores never affect standings. A match counts only when:

- status is `finished`;
- both scores are numbers, including zero;
- `countsForStandings` is `true`;
- both participants reference real teams.

Playoff matches use `countsForStandings: false`.

## Standings Rules

Default scoring:

- Win: 3 points
- Draw: 1 point
- Loss: 0 points

Tournament matches are expected not to end in a draw, but the calculation
continues to handle historical draw data safely.

Ordering:

1. Total points.
2. Exactly two teams tied: points from their direct match.
3. Exactly three teams tied: mini-table points using only matches among those
   three teams.
4. If the three-team mini-table remains tied: mini-table goal difference using
   only those internal matches.
5. Unresolved ties: overall goal difference, overall goals for, alphabetical
   order.

Never let a match against a fourth team affect a three-team mini-table.

## Playoffs

Men:

- 1st → Final A
- 2nd–3rd → Semifinal A
- winner Semifinal A vs 1st → Final A
- 4th → Final B
- 5th–6th → Semifinal B
- winner Semifinal B vs 4th → Final B

Women:

- 1st–2nd → Final

Unknown playoff participants use `homeLabel` and `awayLabel`. Replace those
labels with team IDs when participants are known.

## UI Behavior

- Mobile-first, single-column sports interface.
- Tournament and view selections persist in local storage.
- Matches are grouped chronologically by day.
- Initial match scrolling targets live, then upcoming, then the final match.
- Auto-scroll runs only on initial timeline mount or tournament change.
- Dates are Spanish and use `America/Argentina/Ushuaia`.
- Do not expose repository paths or implementation instructions in the public
  interface.

## Tests

Standings tests must cover:

- win/loss;
- zero score handling;
- missing results;
- ignored playoff matches;
- category separation;
- two-team direct-match tiebreaker;
- three-team mini-table;
- exclusion of fourth-team matches from the mini-table.

Team tests must protect exact public names and the three independent CAU IDs.

## Firebase Administration

Firebase is configured in project `cfm-hockey` on the free Spark plan:

- project display name: CFM Ushuaia Hockey
- Firestore region: `southamerica-west1`
- authentication: Google
- authorized administrator: `braianj@gmail.com`
- public reads; writes restricted to the administrator email by Firestore rules

The public app subscribes to Firestore and falls back to versioned seed data
when the remote database is empty or unavailable. The administration page is
available at `/admin/` and can seed the remote database, edit match status and
scores, and publish or delete match events.

Collections:

- `teams`
- `matches`
- `matchEvents`

`matchEvents` is the source of truth for player statistics. Supported event
types are `goal`, `penalty`, and `major-penalty`; goal events may include an
assist, and penalty events may include penalty minutes. Never maintain
aggregate player totals manually.

The Firebase web configuration is public client configuration, not a secret.
Security is enforced by Authentication and `firestore.rules`.
