# Nuclear War – WOPR Edition

En hyllest-remake av brettspillet **Nuclear War** (Douglas Malewicki, 1965 / Flying Buffalo),
presentert gjennom det visuelle språket til NORAD-scenene i **WarGames (1983)**:
fosforgrønne CRT-terminaler, vektorkart og DEFCON-varsler.

> "The only winning move is not to play." – WOPR

## Status
Spillbart. Fire nasjoner (USA, USSR, CHINA, EURO), sekvensiell turrekkefølge,
animerte rakettbaner, hemmelige kort, fallout og Final Retaliation.

## Slik spilles det
1. **PLAY CARD** – POP-kort huser innbyggere (ubegrenset), våpenkort armeres.
2. **PICK TARGET** – klikk en fiendtlig by; raketten flyr umiddelbart (~3 s ved 1×)
   og treffer, blir avskåret eller drifter av kurs.
3. **END TURN** – hver AI-nasjon handler etter tur, deretter fallout, eliminering
   og eventuell Final Retaliation.

Handlingsbudsjett per runde: 1 diplomati, 2 lanseringer, 1 hemmelighet, ubegrenset POP.

## Stack
- TanStack Start + React 19 + Vite 7
- Tailwind v4, semantiske oklch-tokens i `src/styles.css`
- d3-geo + world-atlas for ekte verdenskart, SVG for kart og animasjon
- Web Audio API (`src/lib/sfx.ts`) for prosedyrell WOPR-lyd
- Vitest for motortester

## Arkitektur
- `src/game/engine.ts` – eneste kanoniske regelvei (`applyOrder` + turfaser)
- `src/game/rng.ts` – seedet PRNG; hele spillet er reproduserbart via `state.seed`
- `src/lib/scheduler.ts` – pause-/hastighetsbevisst tidsstyring for animasjon og lyd
- `src/routes/play.tsx` – orkestrering av spiller- og AI-sekvenser

## Dokumentasjon
- [`log.md`](./log.md) – kronologisk arbeids- og beslutningslogg
- [`GAUNTLET.md`](./GAUNTLET.md) – kvalitetsløp, bevis og gjenstående risiko