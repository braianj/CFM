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

A match is two stopped-clock periods of 15 minutes, plus 5 minutes of stopped-clock
overtime and then a shootout if it is still tied. The clock runs continuously once a
team leads by `RUNNING_CLOCK_LEAD` goals. Each team has `TIMEOUTS_PER_TEAM` timeout.

`MATCH_DURATION_MINUTES` is wall-clock time, not played time, so it is NOT derived
from the periods: a stopped clock takes far longer than 30 minutes. It must never
exceed the smallest gap between consecutive slots in the fixture, or two matches
show as live at once; a test in `src/data/matches.test.ts` enforces that against the
real schedule.

Kick-off times are always written with Ushuaia's offset. Read them with
`splitStartDateTime` and write them with `buildStartDateTime`; never round-trip a
kick-off through `Date`, or the panel would show the editor computer's timezone.

Rescheduling is an owner action. `onlyResultChanged` in `firestore.rules` keeps an
editor from moving a match, so the date inputs are hidden for them and refused by
the server anyway.

The scoresheet closes at the match's scheduled time. A delayed start does not extend
it. The panel does not enforce this, because the deadline belongs to the table.

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

- Win in regulation: 3 points
- Win in overtime or shootout: 2 points
- Loss in overtime or shootout: 1 point
- Loss in regulation: 0 points

`Match.resolution` records how the match was settled: `regulation`, `overtime` or
`shootout`. An absent value means regulation. Overtime and shootout are worth the
same today, but they are stored separately and priced by separate `ScoringRules`
keys, so the tournament can change one without touching the other.

These tournaments have no draws: a tie at the end of regulation goes to overtime
and then to a shootout. `ScoringRules.draw` is only a safety net for malformed
data, and a tied score ignores `resolution` entirely.

`awardPoints` in `src/utils/standings.ts` is the only place that turns a result
into points. The overall table and every tie-breaking mini-table must use it, or
an overtime result would be worth three points inside a tiebreaker.

`StandingRow.won` and `StandingRow.lost` count regulation results only.
Overtime results live in `overtimeWon` and `overtimeLost`.

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

## Discipline

Two rules, both derived from `matchEvents` by `src/utils/discipline.ts`:

- `MINORS_FOR_EJECTION` minor penalties in a single match eject the player and cost
  them the next one. Majors do not count towards this.
- `MINUTES_FOR_SUSPENSION` penalty minutes across the tournament cost one match. The
  player may finish the current one unless they were also ejected for minors.

The calculation counts and flags; it never decides which match somebody misses and
never blocks a roster entry. Which fixture a suspension falls on is the
organisation's call, and the panel must not pretend otherwise.

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

## Analytics

Usage tracking runs on Google Analytics for Firebase, wrapped by
`src/analytics.ts`. Components never call the SDK directly; they call `track`.

`MEASUREMENT_ID` in `src/firebase.ts` switches the whole thing on. While it is
empty, `track` returns immediately and the bundler drops the SDK entirely, so an
unconfigured build ships no analytics code at all. The SDK is behind a dynamic
import so it stays in its own chunk.

Never send a person's name, an identity document, or anything that identifies a
visitor. Events carry team IDs, team names, view names and tournament scope only.

Analytics must never break the page: `initAnalytics` swallows load failures on
purpose, because an ad blocker or an unsupported browser is a normal outcome.

Events:

- `select_view` — `view`, `tournament`
- `select_tournament` — `tournament`
- `select_team` — `team_id`, `team_name`, `category`
- `admin_action` — `action`, plus `resolution` or `event_type` where they apply

Page views, sessions and first visits are collected automatically once the
measurement ID is set.

## Colour

The palette is Club Andino Ushuaia's: green and white. The greens are sampled from
the club's own material, `#44924f` and `#1b3e2f`, darkened where contrast required
it. Every colour lives in `src/styles/global.css` as a custom property; no component
may hardcode a brand colour.

The file has two layers. The palette holds raw colours: `--deep` for dark headers
and table heads, `--accent` for the brand green, `--accent-dark` for readable green
text and buttons, `--accent-soft` and `--accent-faint` for tints.

On top sit the interaction roles, which say what a colour *means*:
`--state-selected` and `--state-selected-ink` fill whatever is chosen,
`--state-selected-soft` and `--state-selected-line` mark a field that is filtering
the screen, `--state-hover` is the hover tint and `--state-idle-ink` is an
available but unchosen option. Components use the roles, never a raw colour, so
selection looks the same everywhere.

The living style guide is at `?design=1` (or `/design/`), built from
`src/design/DesignSystem.tsx`. It measures contrast from the real tokens at
runtime, so it cannot drift from the stylesheet. It is lazily imported and never
reaches a normal visitor's bundle.

`src/styles/palette.test.ts` parses those tokens and enforces 4.5:1 for text pairs
and 3:1 for focus rings and strong borders. Adjust a colour only if that test
still passes.

## UI Behavior

- Mobile-first, single-column sports interface.
- The tournament selector has three scopes: `all`, `men` and `women`. `all` is the
  default and shows both categories together: one combined chronological match
  listing, and one standings or statistics section per tournament.
- Every match card shows its tournament only while both categories are listed.
- Tournament, view and team-filter selections persist in local storage.
- Views are `matches`, `rosters`, `standings` and `statistics`.
- The matches view filters by team. A team's listing keeps the playoff matches it
  could still reach, mirroring the official per-team sheets, and never includes
  the other tournament.
- The rosters view shows the registered squad of every team in scope, or of a
  single team when one is selected. The panel must keep reading the raw `players`
  collection so its publish check stays true.
- The public rosters merge `src/data/players.ts` with the published documents by
  ID (`mergeRosters`). Never switch between the two lists on a condition such as
  `players.length`: a published collection arrives over several snapshots, and an
  all-or-nothing switch blanks the squads that have not arrived yet.
- Because the versioned squad is the baseline, a player is removed by setting
  `active: false`, never by deleting the document. A deleted document would fall
  back to the versioned entry and the player would reappear. Deactivating also
  keeps the events that already reference that player.
- Changing tournament clears the team filter, and a stored team outside the
  selected scope falls back to all teams.
- Matches are grouped chronologically by day.
- Initial match scrolling targets live, then upcoming, then the final match.
- Auto-scroll runs only on initial timeline mount or tournament change.
- Dates are Spanish and use `America/Argentina/Ushuaia`.
- Do not expose repository paths or implementation instructions in the public
  interface.

## Tests

Standings tests must cover:

- win/loss;
- overtime win and overtime loss;
- a shootout paying the same as overtime;
- an overtime result inside a head-to-head tiebreaker;
- a tied score flagged as overtime, which must fall back to draw points;
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
- owner: `braianj@gmail.com`, hardcoded in `firestore.rules` and `src/firebase.ts`
- other administrators live in the `admins` collection, keyed by lower-case email
- public reads on tournament data; writes restricted to administrators

The public app subscribes to Firestore and falls back to versioned seed data
when the remote database is empty or unavailable. The administration page is
available at `/admin/`. Its primary tabs are Matches, Teams, and Statistics;
each has a men's/women's tournament selector. It edits the fixed six men's and
five women's team slots, creates scheduled matches, edits scores, manages
rosters, and publishes or deletes match events. Never expose internal match
IDs in the interface.

A `Datos oficiales` action replaces every published team and match with the
versioned seed data and upserts the versioned rosters. It is destructive for
`teams` and `matches`, additive for `players`, and leaves `matchRosters` and
`matchEvents` untouched. It must stay behind an explicit confirmation, and it
must not run automatically on load. The panel shows it as a warning banner while
the published data differs from the versioned data, and as a discreet
maintenance section once they match.

Administrators are data, not code, and come in two levels stored as `role` on the
`admins` document:

- `owner` runs the tournament: creates and deletes matches, edits teams and squads,
  publishes the official data, and manages the administrator list.
- `editor` only reports what happens on the ice: results, match rosters and events.

An editor may update a match, but only the keys in `onlyResultChanged()`. Moving a
match to another day or swapping a team is an owner action, enforced in the rules
and not merely hidden in the panel.

The founding owner stays hardcoded in `firestore.rules` and `src/firebase.ts` so the
tournament can never be locked out and so the first administrator can be added to
an empty list. Any other owner is granted with `role: 'owner'`.

`firestore.rules` grants read access per collection instead of with a catch-all: a
new collection is private until it is listed. The `admins` collection is never
public, because it holds personal addresses. A signed-in person may read only
their own entry; administrators may read and change the whole list.

The rules are NOT deployed by CI. After changing `firestore.rules`, run
`firebase deploy --only firestore:rules --project cfm-hockey`, and deploy them
before shipping code that depends on them.

`firestore.rules.test.ts` exercises the rules against the Firestore emulator with
`npm run test:rules`. It is excluded from `npm test` because it needs the emulator,
and it runs the emulator through `firebase-tools@13` on purpose: the current CLI
requires Java 21 and this machine has 17. Drop the pin once the JDK is upgraded.
Every permission change must be covered there: the panel hiding a button is not
enforcement.

Collections:

- `admins`
- `teams`
- `players`
- `matchRosters`
- `matches`
- `matchEvents`

Club registration sheets carry identity documents and birth dates. Never store
them, never echo them, and never add fields for them. `src/data/players.ts` keeps
names and the declared squad role only. A player document holds no field beyond
`id`, `category`, `teamId`, `name`, `role`, `number` and `active`, and a test
enforces that shape.

`role` is the role declared on the registration sheet: `C`, `A` or `GK`. It is
permanent, unlike the jersey number, which belongs to the match roster entry.

Firestore is initialised with `ignoreUndefinedProperties`. The panel writes
optional fields as `undefined` (a goal with no assist, a player with no number)
and every one of those writes would otherwise throw.

Games played come from `matchRosters`: dressing for a match is playing it, counted
once per match even if the roster holds duplicates. A player who dressed is listed
with zeros rather than hidden, the way the organisation's own sheets do it.

`matchEvents` is the source of truth for the rest of the player statistics. Supported event
types are `goal`, `penalty`, and `major-penalty`; goal events may include first
and second assists, and penalty events may include penalty minutes. Events may
record a period and game clock. Never maintain
aggregate player totals manually.

Jersey numbers belong to a player's match roster entry, not permanently to the
player. A player may be absent or use a different number in every match.
Statistics entry must only offer players included in that match's roster.

The Firebase web configuration is public client configuration, not a secret.
Security is enforced by Authentication and `firestore.rules`.
