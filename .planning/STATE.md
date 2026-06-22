# GSD Project State

## Project
hokédex — Moments Redesign

## Current Phase
2 — Camera-First Nav Shell (rebuild)

## Phase Status
| Phase | Status |
|-------|--------|
| 1 — Schema, Interfaces & Conventions | complete |
| 2 — Camera-First Nav Shell | not started (rebuilt — old plans invalidated) |
| 3 — Camera Capture Path | not started |
| 4 — Moments Tab + Moment Detail | not started |
| 5 — People Tab + Voice Capture | not started |
| 6 — Maps Tab + Calendar + Place Resolver | not started |
| 7 — Gallery Ingestion, Memory Generation & Intelligence | not started |

## Config
- mode: interactive
- depth: standard
- parallelization: true
- commit_docs: false
- research: true
- plan_check: true
- verifier: true
- model_profile: balanced

## Planning Files
- PROJECT.md ✓
- REQUIREMENTS.md ✓
- ROADMAP.md ✓
- CONVENTIONS.md ✓
- STATE.md ✓

## Decisions
- saved_places created before moments in 007 DDL (FK ordering requirement)
- backfillMoments uses data migration version 2 (version 1 taken by backfillEncounters)
- INSERT OR IGNORE in backfill ensures idempotency
- [Phase 01]: Result<T> defined once in moments.ts, imported by rules.ts and resolvers.ts
- [Phase 01]: Rule.evaluate returns Result<RuleResult> | null — null means rule does not apply
- [Phase 01]: PlaceResolver.resolve is async to support GPS/network lookups in implementations
- [Phase 01]: lucide-react-native installed as dependency; src/components/icons/index.ts is sole import site (R-CONV-05)
- [Phase 02]: RootStackParamList moved to types.ts, re-exported from RootNavigator for backward compatibility
- [Phase 02]: timelineMapRef is module-level ref; TimelineScreen exposes toggleMap via useImperativeHandle
- [Phase 02]: Used barrel icon names (Plus, User, Mic, Camera) without Icon suffix — adapted to actual barrel exports
- [Phase 02]: Added User to icons/index.ts barrel as it was missing but needed for Contact option icon
- [Phase 02]: Easing.sin used instead of Easing.sine (correct reanimated API name)
- [Phase 02]: RadialFAB from 02-01 preserved in HomeScreen during 02-02 replacement

## Session
- Last session: 2026-06-22
- Stopped at: Major UX redesign — camera-first nav, 4 tabs (Camera · Moments · People · Maps), no Home screen, Planner inside Moments tab, roadmap + requirements rewritten. Phase 2 plans invalidated and need replanning.

## Notes
- Source plan: MOMENTS_PLAN.md
- All decisions from MOMENTS_PLAN.md "Decisions (closed)" table are locked
- CONVENTIONS.md must be read by all executor agents before writing code
- Phase 1 is the choke point — no parallel tracks until interfaces are locked
