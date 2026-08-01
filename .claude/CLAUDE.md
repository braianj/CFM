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

A match whose result is already saved collapses in the panel to a header with the
teams, the kick-off and the score, and reopens on click to correct it. The list is
about what still needs loading, so it must not force the operator past rows that
are already done.

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

A walkover (`walkover`) is a side not turning up. It pays `walkoverWin` / `walkoverLoss`,
3 and 0 by default, and is priced by its own keys so the organisation can change what a
walkover is worth without touching a regulation win. It counts in `won` and `lost`, never
in the overtime columns, because nothing was played beyond regulation. The nominal score
the operator enters counts for goal difference like any other, so entering 1-0 gives the
present team a goal. A walkover is `finished` from the moment its result is loaded:
`getAutomaticMatchStatus` must not let the clock call it live, because nobody took the ice.

`Match.resolution` records how the match was settled: `regulation`, `overtime`,
`shootout` or `walkover`. An absent value means regulation. Overtime and shootout are worth the
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

Ordering follows the Olympic method:

1. Total points.
2. Any number of teams level on points are separated by a mini-table built only from
   the matches they played against each other: mini-table points, then mini-table goal
   difference, then mini-table goals for.
3. Whoever is still level after that is compared again the same way, using only the
   matches among the teams that remain level. A five-team tie can resolve down to a
   clean order this way, and each pass is strictly smaller so it always terminates.
4. When the mini-table separates nobody, the overall record decides: goal difference,
   goals for, alphabetical order.

The rule applies to a tie of any size. Restricting it to two or three teams was a bug:
four level teams fell through to overall goal difference, which put a team above one
that had beaten it, on the strength of goals scored against somebody else entirely.

Never let a match against a team outside the tie affect the mini-table. And note that
with more than two teams level, "they beat us" is not decisive on its own: the
mini-table is a real table, and goal difference inside it counts.

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

Unknown playoff participants use `homeLabel` and `awayLabel`. They fill in by
themselves: `resolvePlayoffParticipants` seeds the first round from the final standings
once every regular match of that category has a result, and carries winners and losers
forward as each round is played.

That derivation happens at read time, in `useTournamentData`, so correcting a result
corrects the bracket instead of leaving a stale team behind. It must never be written
back: a frozen participant would survive the correction, and an editor saving a playoff
result would have the write refused by `onlyResultChanged` for touching `homeTeamId`.
The hook therefore also exposes `publishedMatches`, exactly what Firestore holds, and
that is what the panel writes.

The seeding waits for the whole regular phase on purpose. A table that can still move is
not a seeding. An explicitly published participant always wins over the derived one: if
the organisation named a team, that is a decision, not a placeholder.

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
- The matches, rosters and statistics views filter by team. A team's match listing keeps
  the playoff matches it could still reach, mirroring the official per-team sheets, and
  never includes the other tournament. Filtering the statistics ranks that team's own
  scorers, because somebody looking at one squad is asking about that squad. Standings
  are never filtered: a table is the whole tournament or it is nothing.
- The rosters view shows the registered squad of every team in scope, or of a
  single team when one is selected. The panel must keep reading the raw `players`
  collection so its publish check stays true.
- Selecting a player opens their card, built by `buildPlayerRecord`: the totals, and
  underneath them every match they dressed for with what they did in it. The card is
  not persisted the way the tournament, view and team filter are, because it is where
  somebody happens to be, not a preference; changing any of those three closes it.
  A player is identified by name inside their team, the same key the statistics use,
  because an event may carry no player id.
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
- A match card with published events unfolds on click into what happened, built by
  `buildMatchSummary`. A card with no events is not a button: it must not offer to
  open onto nothing. The panel renders the same summary for the selected match, so
  the operator reads the events in the order the scoresheet describes and can spot a
  misread before the public does.
- Inside a period the game clock counts down, so a larger remaining time is earlier.
  An event with no clock sinks to the end of its period, and one with no period goes
  after every period, instead of jumping to the top the way a zeroed clock would.
- `MatchEvent.gameTime` stores the rink clock exactly as the scoresheet writes it,
  which is the time *left*. The site reads time *played*, so `buildMatchSummary`
  inverts it against `periodLengthMinutes`, and overtime is measured against its own
  shorter period. Never store the converted value: the panel has to stay copyable
  straight off the paper, and only the stored form can be audited against it.
  A clock longer than its period cannot be inverted and is shown as written rather
  than turned into an invented number, which is also how a misread gets noticed.
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
when the remote database is empty or unavailable. All five collections are seeded, not
just `matches` and `teams`: `src/data/matchRosters.ts` and `src/data/matchEvents.ts`
carry the transcribed scoresheets, and the hook starts from them. The site therefore
renders the real tournament with zero reads, and a snapshot only refines it.

That matters because the app subscribes to whole collections: every page load costs one
document read per record, so about a thousand on a loaded tournament. The Spark plan
allows 50,000 reads a day, which is roughly fifty visits. Exhausting it returns
`RESOURCE_EXHAUSTED` on every read and the site would otherwise show an empty fixture.
Seeding removes the outage; making the roster and event subscriptions lazy is what
would remove the cost, and is still pending.

The public site therefore subscribes to `matches` and `teams` only: 45 documents a visit
instead of a thousand, which is the difference between the free quota lasting fifty
visits a day and lasting a thousand. `useTournamentData({ detail: true })` turns the
other three subscriptions on, and only the panel passes it, because the panel edits them.

The cost is that squads, call-ups and events reach the public site on deploy, not on
write. That is the right trade for data transcribed off paper hours after the match, and
it is why `npm run seed` exists: it rewrites the three versioned files from what is
published. Run it after loading scoresheets, review the diff, and deploy. It reads each
collection once; do not loop it, because reads are what the quota counts. The administration page is
available at `/admin/`.

The panel is organised by match, not by feature, because the operator works from one
paper scoresheet at a time. It is one screen deep at every level: the list of matches
gives way to one match, and one match gives way to one event being loaded or corrected.
Nothing that is not being worked on stays on screen.

The landing view is a list of matches, each saying what it
still needs; opening one replaces the screen with that match's three numbered steps:
**1. El resultado**, **2. Quiénes jugaron**, **3. Qué pasó**, **4. Los arqueros**.
Steps 2 to 4 hold long lists, so they start folded with their heading reporting what is
inside; the result stays open because it is short and is what gets loaded first. Which
steps are open is held by the workspace, not by the step, so a step survives a trip to
the event editor. They are numbered because
the order matters: step 3 resolves a jersey number through the call-up loaded in step 2.
Squad membership and team names are not per-match, so they live in a separate
`Equipos y planteles` tab that only an owner sees.

The match list shows the organisation's own match code (`H-8`, `D-3`), which is printed
at the top of the paper sheet. This is the one place a document ID is shown, and it is
shown because it is not really an ID: the fixture IDs were chosen to mirror the official
codes, and hiding them forced the operator to match a match by team names and time.
The public site still never shows it. A match with no official number, such as a playoff
or one created from the panel, shows its stage instead of inventing a code.

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
once per match even if the roster holds duplicates. `calculatePlayerStatistics` returns
a row for everyone who dressed, with zeros; deciding who is worth showing is the view's
job, not the calculation's.

Goalkeeping also lives on the roster entry, as optional `saves`, `goalsAgainst` and
`minutesPlayed`, because the scoresheet records it in its own footer block and only
that block says where a change of goalkeeper happened. It is not derived from the
events: two keepers can split a match, and the events cannot say which of them was on
the ice. `calculateGoalkeeperStatistics` reads those lines, and a roster entry counts
as a goalkeeper's only once any part of the line was written down.

Shots on target are never stored. They are saves plus goals against, computed on read,
so the three can never disagree. A goalkeeper who faced nothing has a null save
percentage, not a perfect one, and is ranked last rather than first.

`matchEvents` is the source of truth for the rest of the player statistics. Supported event
types are `goal`, `penalty`, and `major-penalty`; goal events may include first
and second assists, and penalty events may include penalty minutes. Events may
record a period and game clock. Never maintain
aggregate player totals manually.

A published event is corrected in place: the panel loads it back into the same form
and saves it under its own document ID. It must never be corrected by deleting and
re-adding, which loses the original ID, and the form must keep offering a player who
was since dropped from the squad, or their events could not be fixed at all.

An event is entered by jersey number, because that is all a scoresheet records. The
number resolves the player through that match's call-up. A number nobody claims is
published anyway with `playerName` empty, and so is a missing period, clock or penalty
minute count: the hole belongs in the database where it can be seen and filled in by
hand, not dropped on the floor. `MatchSummaryLine.missing` names what each line is
still waiting for, and the panel counts them per match.

An event with no `playerName` never reaches the statistics or the discipline count. A
nameless row in the scorers table would be worse than the gap it papers over, and in
`calculateDiscipline` it was actively wrong: every unmatched number on a team collapsed
into one key, so four penalties belonging to two different unknown players added up to
an ejection and a suspension against nobody. Losing the row is the correct outcome; the
panel is where an unattributed penalty gets chased, not the public page.

The statistics view is split by position, because goalkeeping is measured in shots and
saves and a skater's table has no column for any of it. `Jugadores` and `Arqueros` never
share a screen. The players side leads with a leaderboard of who scored, and keeps the
nine-column sheet behind a disclosure. Players tied on points share a position.

A player who dressed and neither scored nor was penalised is NOT listed. Statistics are
about what somebody did; listing everybody turns the page into a squad list with a
column of zeros beside it, which is what the rosters view is for. They are counted in a
line underneath instead, so the information is not lost. `calculatePlayerStatistics`
still returns them, because games played is a real statistic and the panel needs the
whole set; the omission belongs to the view.

Jersey numbers belong to a player's match roster entry, not permanently to the
player. A player may be absent or use a different number in every match.
Statistics entry must only offer players included in that match's roster.

The Firebase web configuration is public client configuration, not a secret.
Security is enforced by Authentication and `firestore.rules`.
