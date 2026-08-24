# Codex Handoff — Arnak Web Port

Last updated: 2026-08-24
Active branch: `web-engine/mvp`
Repository: `Huge-BB/Lost-Ruins-of-Arnak-TTS`

This document is the primary handoff for continuing the Web port locally with Codex.

## 1. Project direction

The repository started as a Tabletop Simulator implementation of **Lost Ruins of Arnak**. The current branch adds a Web-native deterministic game engine under `web/`.

The architectural goal is:

```text
GameState + EngineCommand -> GameState
```

Rules should stay independent from UI/networking. Browser/server code should use the public engine facade instead of importing internal reducers directly.

Canonical client/server entry point:

```text
web/src/engine-api.ts
applyEngineCommand(state, command, context)
```

This facade routes normal actions through leader-aware + action-window logic and pending choices through the shared pending-choice dispatcher.

## 2. Current high-level status

Core engine is fairly mature.

Implemented or substantially implemented:

- turn / round flow
- market
- card buying / playing
- Dig / worker placement
- Discover
- Level I / II sites
- guardians
- idols
- assistants: supply / claim / upgrade / refresh / exhaustion
- Bird / Snake / Monkey / Lizard research topology/data
- research resource costs / travel costs / rewards
- Temple arrival
- temporary travel / action-window model
- Expedition Leaders: Captain / Falconer / Baroness / Professor / Explorer / Mystic
- shared public pending-choice dispatcher
- canonical Web-facing engine command facade
- asset extraction + localization tooling

See `docs/WEB_ENGINE_PROGRESS.md` for the longer status checklist.

## 3. Temporary travel model

Temporary travel was recently unified around an action-window model.

Important rule semantics already represented:

- travel produced during an action window may be consumed by a later action in that same window;
- producer may be a main action or free/quick action;
- consumer may be a main action or free/quick action;
- generated travel cannot retroactively pay the cost of the action that generated it;
- action-window travel clears on `END_TURN` / `PASS`.

Relevant files:

```text
web/src/action-window.ts
web/src/travel-payment.ts
web/src/engine-with-action-window.ts
web/src/engine-with-leaders.ts
web/src/engine-api.ts
web/src/temporary-travel-integration.test.ts
```

Dig / Discover / Research are all connected to the temporary-travel model at the facade level.

There is still an old direct `payTravelFromHand()` implementation inside `web/src/engine.ts`. Do not delete it blindly until tests pass and all internal callers have been audited. `web/scripts/audit-engine-routing.mjs` was added to help identify legacy paths.

## 4. Expedition Leaders

All six leaders have core state/rules implemented.

### Captain

Implemented:

- 3 archaeologists
- specialist action
- starting cards
- unique blue Idol effect
- temporary plane generation

### Falconer

Implemented:

- eagle track
- eagle advancement / return
- starting cards
- tracking
- guardian boon
- unique Idol effect

### Baroness

Implemented:

- income
- Special Delivery
- special Item destination behavior
- starting cards
- unique Idol effect

### Professor

Implemented:

- archive
- suitcase
- archive Artifact purchase
- starting cards
- unique Idol effect

### Explorer

Implemented:

- single archaeologist
- snacks
- archaeologist movement
- snack refresh
- Scouting
- Cartography, including activating a face-up Idol without taking/flipping it
- unique Idol effect

### Mystic

Implemented:

- Fear/exile/ritual foundations
- five Idol slots
- Fear-marked slots
- three blue slots
- ritual branches
- unique Mystic Idol branches
- exile -> ritual chains

Six-leader coverage exists in:

```text
web/src/leaders/integration-matrix.test.ts
```

Local execution still needs to confirm all newly added tests.

## 5. Pending choice architecture

Serialized pending state remains:

```text
GameState.pendingRewards
```

The Web-facing choice resolver is:

```text
web/src/pending-choice.ts
resolvePendingChoice(...)
```

Clients should submit a discriminated `PendingChoice` through `engine-api.ts` rather than importing specialized research/leader resolvers.

Several research and leader pending flows are already routed through this dispatcher.

Known major pending gap:

```text
assistant:ACTIVATE_SILVER / assistant effect activation
```

The generic assistant effect resolver is intentionally not finished because TTS objects do not include assistant names/rules text. The rules catalog has been recovered, but the 12 visual TTS identities still need binding to effect keys.

## 6. Assistant effect work

Relevant files:

```text
web/data/assistant-effects-manual.json
web/scripts/audit-assistant-effects.mjs
web/src/assistants.ts
web/src/assistant-actions.ts
```

The manual data file contains the recovered base-game silver/gold effect definitions and placeholder mappings for the 12 TTS assistants.

TTS assistant JSON reliably gives:

- GUID
- CardID
- sheet URL
- grid dimensions
- card index

It does **not** reliably give assistant name or effect text.

Remaining work:

1. Visually bind each of the 12 TTS GUID/CardID entries to an effect key in `assistant-effects-manual.json`.
2. Make the audit strict once all mappings are filled.
3. Implement the assistant effect resolver.
4. Route assistant pending activation through `pending-choice.ts`.

Do not guess the GUID -> effect mapping from JSON alone.

## 7. Asset localization

Asset localization tooling was just added and has been locally exercised successfully in sprite-sheet mode.

Commands:

```bash
cd web
npm run assets:localize
```

This successfully produced, on Windows local checkout:

```text
Asset manifest: 602 sprite references across 86 unique image URLs
Note: 3 image URL(s) are referenced with multiple TTS sprite grids; per-asset grids are preserved.
Validated 602 asset references across 86 localized image URLs
Localized 86 sheets and 602 asset references (sprite-sheet)
```

The localized sprite sheets are written to:

```text
web/public/assets/sheets/
```

Runtime/public maps:

```text
web/src/generated/local-assets.json
web/public/assets/asset-map.json
```

The generated map preserves per-asset:

```text
sheetUrl
sheetWidth
sheetHeight
cardIndex
```

Optional per-component cropping:

```bash
npm run assets:localize:crop
```

This uses `sharp` and writes individual WebP files under:

```text
web/public/assets/cropped/
```

Validation commands:

```bash
npm run assets:validate
npm run assets:validate:local
```

Relevant implementation files:

```text
web/scripts/build-asset-manifest.mjs
web/scripts/localize-assets.mjs
web/scripts/validate-assets.mjs
web/ASSETS.md
```

Important TTS quirk already handled: the same image URL may be referenced using different `NumWidth/NumHeight` grids. Sheets are deduplicated by URL, while each asset keeps its own grid metadata.

## 8. Generated data

`web/src/generated/` is produced locally by extraction scripts and is not assumed to exist in a fresh checkout.

Useful commands:

```bash
npm run extract:data
npm run assets:prepare
```

Current extraction observed locally:

```text
241 cards
  Item=101
  Artifact=91
  Fear=1
  Starter=48
17 sites
16 idols
15 guardians
4 research tracks
12 base-game assistants
```

## 9. Tests and audits

Primary command:

```bash
cd web
npm test
```

This currently runs:

- research validators
- engine routing audit
- Node TypeScript test suite

Additional useful commands:

```bash
npm run audit:routing
npm run audit:assistants
npm run validate:research
```

At handoff time, many recent tests were authored through GitHub without a local repository runtime. The user intends to run the suite locally. Treat failures as expected integration feedback; fix them rather than assuming the newest tests already pass.

## 10. Frontend status

A real UI has effectively not been built yet.

`web/` is currently the deterministic engine/data/tooling project. There is no React/Vue/Next/Vite application layer yet.

The engine was intentionally prepared for UI integration first:

```text
web/src/engine-api.ts
```

A sensible first UI milestone is a local hot-seat/debug client with:

- game setup
- main board
- player area / hand
- market
- research track
- pending-choice modal
- direct use of local assets

This can be done before multiplayer networking.

## 11. Recommended continuation order

Recommended priority after pulling this branch locally:

1. Run `npm test` and fix actual failures from the recent integration work.
2. Run `npm run assets:localize:crop` and validate the individual asset pipeline.
3. Complete the 12 assistant GUID -> effect-key visual bindings.
4. Implement assistant effect resolution and pending integration.
5. Re-run the full test suite and routing audits.
6. Remove/narrow legacy travel-payment paths only after tests prove the canonical facade covers all cases.
7. Start the frontend against `engine-api.ts`.
8. Add multiplayer/server authority later; do not make the browser the authoritative multiplayer state source.

## 12. Architecture constraints to preserve

Please preserve these decisions unless there is a concrete reason to change them:

- Keep rule transitions deterministic and serializable.
- Keep the engine independent from UI/network code.
- Use `applyEngineCommand()` as the Web/network command boundary.
- Do not let UI code call `reduce()`, leader reducers, or specialized pending resolvers directly.
- Preserve per-action temporary-travel semantics.
- Do not infer assistant rules from opaque TTS GUIDs.
- Preserve TTS sprite `cardIndex` semantics during local asset migration.
- Prefer adding focused integration tests whenever a public engine flow changes.

## 13. Files worth reading first

```text
docs/WEB_ENGINE_PROGRESS.md
docs/CODEX_HANDOFF.md
web/README.md
web/package.json
web/src/types.ts
web/src/engine-api.ts
web/src/engine-with-leaders.ts
web/src/engine-with-action-window.ts
web/src/pending-choice.ts
web/src/leaders/integration-matrix.test.ts
web/data/assistant-effects-manual.json
web/ASSETS.md
```

The TTS implementation under `src/` and `objects/` remains the source/reference material when Web rules need verification.
