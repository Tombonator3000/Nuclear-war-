# GAUNTLET — Nuclear War: WOPR Edition

Quality loop scorecard. Reference: NORAD big-board scenes in *WarGames* (1983),
judged as a playable command-terminal strategy game, not as a static UI.

## Acceptance bar
1. New game → play POP card → arm weapon → click enemy city → one missile travels
   ~2.5–3.5 s at 1× → visible hit/intercept → END TURN → AI nations act one by one.
2. Secrets, propaganda, ABM/intercept, guidance fault/collateral, fallout,
   elimination, animated Final Retaliation, victory, defeat, mutual destruction.
3. Deterministic seeds reproduce combat and AI decisions.
4. Pause/resume and ¼×/½×/1×/2× never skip impacts, double-resolve or lock input.
5. Save/resume, highscore and restart intact.
6. 1440×900, 768×1024, 390×844: no clipped primary controls, no horizontal
   overflow, readable cards, current action always obvious.
7. Zero uncaught runtime/console errors; tests and typecheck pass.

## Baseline (before this loop) — 4/10
- Two competing rules paths (`submitAndResolve` legacy + `applyOrder` sequential).
- `Math.random()` throughout combat, AI, secrets and card generation — runs not
  reproducible despite documented seeding.
- Final Retaliation resolved silently inside end-of-turn logic, no animation.
- `window.setTimeout` timers ignored pause → audio/visual desync risk.
- Mixed Norwegian/English inside the same controls; permanent instruction wall.
- Right-hand rail overflowed 1440×900; TELEX feed pushed below the fold.

## Passes performed
| # | Pass | Change | Evidence |
|---|------|--------|----------|
| 1 | Determinism | `src/game/rng.ts`, `seed`/`rngState` on `GameState`; engine, AI, secrets and deck all draw from the seeded stream | 19 vitest tests incl. replay equality |
| 2 | One canonical path | Legacy simultaneous resolver removed; `applyOrder` + staged `applyDefconDrop → applyFallout → collectRetaliations → finishRound` | `src/game/engine.ts` |
| 3 | Animated Final Retaliation | Retaliation launches are queued to the same sequential flight/impact pipeline with klaxon + banner | `src/routes/play.tsx` |
| 4 | Pause-safe timing | `src/lib/scheduler.ts` drives every delay and sound cue; pause freezes flight, impact and audio together | mid-flight pause/resume run |
| 5 | Teaching + language | `StepGuide` became a contextual 1-2-3 + single English order line | screenshots |
| 6 | Layout | Compact hand cards (108×92), one-line action budget, TELEX visible without scrolling at 1440×900 | `aside` scrollHeight 1027→865 vs 845 client |

## Final evidence
- `bunx vitest run` → 19/19 passed.
- Typecheck clean.
- Browser flow at 1440×900: POP played (hand 6→5), weapon armed, Moscow clicked,
  launch resolved in **4.9 s** (≈3 s flight + ≈1.5 s impact readout), AI phase ran
  sequentially, turn advanced to 2, DEFCON 4→2, **0 page/console errors**.
- Overflow check: horizontal overflow 0 px at 1440×900, 768×1024 and 390×844.

## Final score — 8.5/10

## Remaining risks
- The AI/retaliation phase is long at ¼× speed; no "skip animation" control yet.
- Extreme viewports (<360 px wide) still scroll the control rail vertically.
- Determinism covers engine rules; animation jitter is wall-clock based by design.

## Pass 7 — engine truth for launches (Phase 1)

| Gap found | Fix | Evidence |
|---|---|---|
| UI re-derived hit/intercept by diffing population, so a guidance-fault missile exploded over the *requested* city while the engine damaged another | `applyLaunch` now returns a `LaunchResult` (`outcome`, `impactCityId`, `damage`, `reason`); `animateLaunch` animates to `result.impactCityId` and labels the flight `(DRIFT)` | `tests/launch-result.test.ts` — drift test asserts damage lands on the impact city, requested city only takes collateral |
| 25M population cards silently wasted citizens when few cities remained | `resolvePlayPop` distributes 100 % round-robin | test files 5/10/15/20/25M with 4 cities |
| Two nations eliminated in the same fallout tick fired one merged salvo | `groupRetaliations` splits by nation; `runEndOfRound` runs one banner + salvo per nation in deterministic order | simultaneous-retaliation test |
| Klaxons bypassed the pause clock | `sfx.klaxonCycle()` + `KLAXON_CYCLE_MS`, each cycle scheduled via `clock().after()` | pause/resume E2E |
| No reproducible run for tests | `/play?seed=<n>` replay hook | E2E runs on seed 20260730 |

Commands: `bun run test` (37 unit tests), `bun run test:engine`, `bun run test:e2e`.

E2E (`tests/e2e/wopr-flow.py`, 1440×900) — all 7 checks pass: weapon in hand,
missile airborne immediately after the real city click, warhead frozen while paused,
no resolution during pause, resolution after resume, AI nations act one at a time
(USSR → CHINA), zero console/page errors.

**Remaining risks:** intercept/hit split is still probabilistic per seed, so the plain
direct-hit test tolerates a chance intercept; the E2E asserts sequencing for the first
two AI nations only, to keep runtime bounded.
