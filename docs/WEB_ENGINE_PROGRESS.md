# Arnak Web Engine Progress

Last updated: 2026-08-23
Branch: `web-engine/mvp`

This document tracks the long-running conversion of the TTS implementation into a deterministic web game engine. It should be updated together with engine changes so that implementation status does not depend on GitHub Issues or Wiki availability.

## Current state

The core engine is already substantial. Turn flow, market, Dig/Discover, sites, guardians, idols, assistants, research tracks, research costs/rewards, and Temple arrival are represented in the TypeScript engine and covered by focused tests.

Research data/topology and validators exist for all four expedition tracks: Bird, Snake, Monkey, and Lizard.

## Temporary travel / action window

Core model is implemented.

Rules represented by the current model:

- Travel produced during an action window can be consumed by a later action in the same window.
- The producer may be a main action or a free/quick action.
- The consumer may be a main action or a free/quick action.
- Travel cannot retroactively pay the cost of the action that produced it.
- The action window is cleared when the turn ends or the player passes.

Integration status:

- [x] Core temporary-travel state/model
- [x] Mixed card + temporary-travel payment planner
- [x] Research travel costs
- [x] Dig / `PLACE_WORKER` facade integration
- [x] Discover / `DISCOVER_SITE` facade integration
- [x] Leader quick action -> Dig integration coverage
- [x] Leader quick action -> Discover integration coverage
- [x] Leader quick action -> Research integration coverage
- [x] Action-window cleanup after `END_TURN` / `PASS`
- [ ] Remove duplicated legacy travel-payment paths once all callers use the unified facade

## Expedition Leaders

All six leaders have data/state and reducer support. Remaining work is concentrated in edge cases, pending choices, and integration coverage.

### Captain
- [x] Core leader state/setup
- [x] Specialist action
- [x] Leader card rules
- [x] Unique idol effect
- [x] Unique idol temporary travel covered against Dig/Discover/Research
- [ ] Final pending-choice/action integration coverage

### Falconer
- [x] Core leader state/setup
- [x] Eagle progression/return action
- [x] Leader card rules
- [x] Unique idol effect
- [ ] Final pending-choice/action integration coverage

### Baroness
- [x] Core leader state/setup
- [x] Income / card behavior
- [x] Leader card rules
- [x] Unique idol effect
- [ ] Final integration coverage

### Professor
- [x] Core leader state/setup
- [x] Suitcase resources
- [x] Archive artifact purchase action
- [x] Leader card rules
- [x] Unique idol effect
- [ ] Final integration coverage

### Explorer
- [x] Core leader state/setup
- [x] Snack model
- [x] Archaeologist movement
- [x] Snack spending/refresh support
- [x] Blue-slot unique idol effect
- [x] Cartography: activate a face-up idol without taking or flipping it
- [x] Cartography pending-choice flow covered end-to-end
- [ ] Final integration coverage

### Mystic
- [x] Core leader state/setup
- [x] Fear/exile/ritual foundations
- [x] Five-slot idol layout represented
- [x] Two Fear-marked idol slots represented
- [x] Three blue idol slots represented
- [x] Mystic-specific idol branches represented
- [x] Arbitrary idol-slot ordering covered
- [x] Five-slot scoring covered
- [x] Fear-slot -> exile -> ritual chain covered
- [ ] Final integration coverage

### Shared leader work
- [x] Blue idol-slot model exists in leader idol actions
- [ ] Verify blue idol-slot behavior for all six leaders end-to-end
- [x] Public pending-choice dispatcher shared by research and leader pending flows
- [ ] Migrate/cover every remaining specialized pending code through the public dispatcher
- [ ] Full six-leader integration test matrix

## Assistants

Base-game assistant setup, claiming, upgrading, exhausting, and refreshing are implemented. TTS object JSON contains sprite metadata but no rules text or assistant names.

- [x] Base 12-assistant TTS identities / CardIDs extracted
- [x] Base 12 silver/gold effect catalog recovered into `web/data/assistant-effects-manual.json`
- [x] Special semantics captured for travel payment, resource upgrade, exile, draw/discard, and market discount
- [x] `audit:assistants` reports unmapped visual bindings without blocking the normal test suite
- [ ] Visually bind the 12 TTS GUID/CardID entries to the 12 effect keys
- [ ] Enable strict assistant-effect validation once all 12 bindings are complete
- [ ] Implement assistant effect resolver and route `assistant:ACTIVATE_SILVER` through `pending-choice.ts`

## Research tracks

- [x] Bird topology/data
- [x] Snake topology/data
- [x] Monkey topology/data
- [x] Lizard topology/data
- [x] Manual topology validator
- [x] Reward validator
- [x] Research resource costs
- [x] Research travel costs through temporary-travel model
- [x] Node rewards / pending rewards
- [x] Temple arrival
- [ ] Continue rule-by-rule verification of expansion-specific edge cases

## Dig / Discover / sites

- [x] Worker placement
- [x] Site discovery
- [x] Level I / II site decks
- [x] Guardians
- [x] Face-up / face-down idols
- [x] Site rewards
- [x] Explorer movement hooks
- [x] Unified temporary-travel facade for `PLACE_WORKER` and `DISCOVER_SITE`
- [x] Free/quick-action temporary travel integration coverage before Dig/Discover
- [ ] Remove or narrow the old direct hand-only travel helper after facade migration is complete

## Pending rewards / choices

`pendingRewards` remains the serialized engine queue. `pending-choice.ts` now provides the canonical client-facing resolver: callers submit a pending index plus a discriminated `PendingChoice`, and the dispatcher routes it to the existing research/leader implementation.

- [x] Generic pending reward representation
- [x] Research pending rewards
- [x] Several leader pending flows
- [x] Consistent public `PendingChoice` contract for the web client
- [x] Unified owner/index validation before pending dispatch
- [x] Dispatcher coverage for research CHOOSE, assistants, free Artifact, Level I site, visible assistant, free guardian, Falconer site, Mystic Artifact, and existing leader choices
- [ ] Route assistant effect activation through the same API after visual effect bindings are complete
- [ ] Ensure every pending state is deterministic and serializable
- [ ] Add integration tests that resume complete actions after chained pending choices

## Assets

Assets are still a separate workstream.

Current card/component images are referenced from TTS JSON and Steam CDN sprite sheets. They have not yet been converted into repository-owned/local static web assets.

- [ ] Inventory all external sprite-sheet/image URLs used by extracted data
- [ ] Download/source local static assets where legally and technically appropriate
- [ ] Preserve sprite metadata or generate cropped individual assets
- [ ] Replace runtime Steam CDN dependencies with local asset paths
- [ ] Add an asset validation script for missing files / invalid sprite indices

## Test / architecture notes

The current `web/package.json` test suite covers core engine, cards/catalog, round flow, travel, temporary travel, cross-action temporary travel, Dig/Discover, research, temples, assistants, scoring, leaders, pending rewards, the unified pending-choice dispatcher, and leader integration.

Near-term priority:

1. Complete the 12 visual assistant effect bindings.
2. Implement the assistant effect resolver and connect assistant pending activation.
3. Build the complete six-leader integration matrix.
4. Remove duplicated legacy travel-payment paths after local tests confirm the facade coverage.
5. Start local asset extraction/migration after engine semantics stabilize.

Local `npm test` verification is pending.

## Definition of engine-complete for the next milestone

The engine milestone is ready when:

- all four research boards validate and play through their special rules;
- all six leaders can complete a full game without unsupported leader actions;
- temporary travel behaves correctly across all supported action ordering combinations;
- Dig, Discover, and Research share the same travel-payment semantics;
- all pending choices can be serialized, presented to a client, resolved, and resumed deterministically;
- the full engine test suite passes with dedicated integration coverage for the above.
