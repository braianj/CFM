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
- Ñires (`men-los-nires`)
- All-Pakas (`men-allpacas`)
- Ovejas Negras (`men-ovejas-negras`)

The three CAU teams are separate teams. Never aggregate their results or
replace them with a generic `CAU` team.

ACEMHH does not field a men's team. `men-acemhh` no longer exists; Ovejas Negras
is a different club that also fields a women's team.

### Women's teams

- CAU Kipas (`women-cau-kipas`)
- All-Pakas Damas (`women-allpacas`)
- Ovejas Negras Damas (`women-ovejas-negras`)
- ACEMHH Damas (`women-acemhh`)
- Ñires Zorras (`women-los-nires-zorras`)

Team IDs are stable across renames. Never rewrite an ID to match a new display
name; published matches reference the ID.

## Match Rules

Supported statuses:

- `upcoming`
- `live`
- `finished`
- `postponed`
- `tbd`

For scheduled matches with real participants, status is automatic: upcoming
before kickoff, live for `MATCH_DURATION_MINUTES`, and finished afterward. The
application recalculates statuses every 30 seconds. `tbd` remains for
placeholder participants and `postponed` is preserved as an exceptional
override.

`MATCH_DURATION_MINUTES` must never exceed the smallest gap between consecutive
slots in the fixture, or two matches show as live at once. The official 2026
fixture uses 60-minute slots.

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

Men (six teams):

- 2nd–3rd → Repechaje A (`repechaje-a`)
- 5th–6th → Repechaje B (`repechaje-b`)
- 1st vs winner Repechaje A → Final A (`final-a`)
- 4th vs winner Repechaje B → Final B (`final-b`)

Women (five teams):

- 5th–4th → Repechaje (`repechaje`)
- 2nd–3rd → Semifinal 2 (`semifinal-2`)
- winner Repechaje vs 1st → Semifinal 1 (`semifinal-1`)
- loser SF1 vs loser SF2 → Tercer puesto (`third-place`)
- winner SF1 vs winner SF2 → Final (`final`)

The men's tournament has no semifinals and the women's tournament has no
Final A/B. Never reuse a stage across categories except `regular` and `final`.

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

Fixture tests must protect the hand-entered schedule:

- unique match IDs and unique start times;
- team references that exist inside the match's own category;
- a complete single round robin per category (15 men's, 10 women's matches);
- playoff matches excluded from standings and scheduled after the regular phase;
- every registered team appearing in the schedule.

## Firebase Administration

Firebase is configured in project `cfm-hockey` on the free Spark plan:

- project display name: CFM Ushuaia Hockey
- Firestore region: `southamerica-west1`
- authentication: Google
- authorized administrator: `braianj@gmail.com`
- public reads; writes restricted to the administrator email by Firestore rules

The public app subscribes to Firestore and falls back to versioned seed data
when the remote database is empty or unavailable. The administration page is
available at `/admin/`. Its primary tabs are Matches, Teams, and Statistics;
each has a men's/women's tournament selector. It edits the fixed six men's and
five women's team slots, creates scheduled matches, edits scores, manages
rosters, and publishes or deletes match events. Never expose internal match
IDs in the interface.

A `Fixture oficial` action replaces every published team and match with the
versioned seed data. It is destructive for `teams` and `matches` and leaves
`players`, `matchRosters`, and `matchEvents` untouched. It must stay behind an
explicit confirmation, and it must not run automatically on load.

Collections:

- `teams`
- `players`
- `matchRosters`
- `matches`
- `matchEvents`

`matchEvents` is the source of truth for player statistics. Supported event
types are `goal`, `penalty`, and `major-penalty`; goal events may include first
and second assists, and penalty events may include penalty minutes. Events may
record a period and game clock. Never maintain
aggregate player totals manually.

Jersey numbers belong to a player's match roster entry, not permanently to the
player. A player may be absent or use a different number in every match.
Statistics entry must only offer players included in that match's roster.

The Firebase web configuration is public client configuration, not a secret.
Security is enforced by Authentication and `firestore.rules`.
