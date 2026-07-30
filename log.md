# Nuclear War Remake – Prosjektlogg

## 2026-07-01 – Initial analyse

### Kildemateriale: Nuclear War (brettspill / dataspill)
- **Opprinnelse:** Douglas Malewicki, 1965 (Flying Buffalo utga senere utvidelser: Nuclear Escalation 1983, Nuclear Proliferation 1992).
- **Digitale versjoner:** New World Computing / Maxis Amiga & DOS-port (1989–1990) – kjent for satirisk tone, animasjoner av sopper og fordampede byer, propaganda-plakater av lederne.
- **Kjernemekanikk:**
  - 2–6 spillere, hver representerer et land med befolkning (millioner) og et arsenal av kort.
  - Kortstokker: **Populasjon** (byer med X millioner), **Våpen** (missiler MX, Minuteman, Poseidon; bombere B‑1, B‑52; ubåter Polaris), **Stridshoder** (1–100 megatonn), **Hemmelige** (spionasje, propaganda, anti‑missile, top secret).
  - Runde: Diplomatifase (traktater kan lyves om) → Trekk kort → Velg hemmelig handling → Avslør samtidig → Løs opp propaganda (stjeler befolkning) eller lansering (våpen + stridshode → mål).
  - Fallout: hver ramt by sprer radioaktivt nedfall over senere runder.
  - **Final Retaliation:** når en spiller er utslettet, får hen fyre av alt gjenværende arsenal. Fører nesten alltid til gjensidig utslettelse.
  - Vinner: sist med > 0 befolkning. Ofte ingen vinner – "Nobody wins nuclear war."

### Visuell referanse: WarGames (1983)
- WOPR / NORAD "Big Board": mørk sal, gigantisk skjerm med verdenskart i **vektor‑grønn på svart** (fosforterminal-estetikk).
- Missilbaner tegnet som lysende parabelbuer, blinkende target-krysshår, ASCII/segment-tellere.
- IBM 5081 / DEC VT100-typografi: monospace, subtile scanlines, CRT-glød og bloom.
- Fargepalett: fosfor‑grønn (#33ff66), amber-varsler (#ffb000), rød alarm (#ff2a2a), sort bakgrunn (#03060a), dempet blå raster.
- UI-språk: DEFCON-nivåer, "STRATEGIC AIR COMMAND", "PRIMARY TARGETS", spillelister av mål som scroller, modaldialoger som "SHALL WE PLAY A GAME?".
- Lyd (senere fase): terminal-bip, telex-klikk, lav dronen fra kjølevifter, alarmsirener.

### Sammensmelting: designbeslutninger
- Hot-seat / lokal multiplayer først (2–5 spillere). Nettverk = senere fase.
- Kart: stilisert **verdenskart som vektorstrek** (ikke fotorealistisk) med by-noder som pulserende prikker.
- Kort presenteres som terminaloppslag: `> LOADING WARHEAD… 20MT`.
- Diplomati-fase: chat-linje ala teleks der spillere kan skrive traktatforslag.
- Lansering: animert parabelbue, countdown, treff → soppsky tegnet i ASCII/vektor, befolkningsteller detter.
- Fallout modelleres per by med "RAD" verdi som drenerer befolkning per runde.
- Ingen "shiny" moderne UI. Alt gjennom CRT-shader-lag (scanlines + vignette + bloom).

### Teknisk skisse (implementeres senere når plan er godkjent)
- TanStack Start (allerede satt opp).
- Tilstand: Zustand-store for spillmotor (rene funksjoner, testbart).
- Rendering: React + SVG for kart/baner, `<canvas>` for CRT-shader overlay (evt. WebGL-post om nødvendig).
- Typografi: VT323 + IBM Plex Mono via Google Fonts (link i `__root.tsx`).
- Farger som semantiske tokens i `src/styles.css` (oklch): `--phosphor`, `--amber`, `--alert`, `--terminal-bg`, `--grid`.
- Ingen backend i MVP – alt lokalt. Lovable Cloud kan legges til senere for online lobbyer.

### Åpne spørsmål før implementasjon
1. MVP-scope: full regelbok (inkl. hemmelige kort + Final Retaliation) eller forenklet?
2. Antall spillere i MVP (2 vs. 2–5)?
3. AI-motstandere fra start, eller kun hot-seat?
4. Lyd i MVP eller senere?

Neste steg: presentere plan via `plan--create` og avvente svar fra bruker.

## 2026-07-01 – Fase 1 implementert
- Lastet VT323 + IBM Plex Mono via `<link>` i `__root.tsx` (Tailwind v4-regel).
- Nye oklch-tokens i `src/styles.css`: `--phosphor`, `--phosphor-dim`, `--amber`, `--alert`, `--terminal-bg`, `--grid`. Semantiske farger (background/foreground/primary/…) omdirigert til fosfor-paletten. Utilities: `text-glow`, `text-glow-amber`, `text-glow-alert`, `terminal-panel`. Keyframes: `crt-flicker`, `crt-scan`, `blink`, `alert-pulse`, `boot-type`.
- `CRTScreen`-komponent gir global scanline-overlay, sveip og vignett.
- Ruter opprettet: `/` (WOPR boot + "SHALL WE PLAY A GAME?"), `/play` (placeholder for spillmotor), `/rules` (WOPR "GAMES"-liste + faseoversikt).
- Meta/OG oppdatert på root + per rute. `sitemap.xml`-rute og `robots.txt` lagt til.
- Neste: Fase 2 – spillmotor (types, engine, kortdefinisjoner) med enhetstester.

## 2026-07-02 — Fase 2.2: treff- og skadeoppløsning
- `resolveLaunch` i `src/game/engine.ts` håndterer nå full oppløsning:
  - **Friendly-fire-vern**: ordre mot egen nasjon avbrytes og loggføres.
  - **Ruin-vern**: skudd mot by med populasjon 0 sløses (kun +1 fallout på ruinen).
  - **Interception**: sannsynlighet = `INTERCEPT_BASE[vehicle] + defconInterceptBonus(defcon)`. ICBM 5% base, SLBM 10%, Bomber 25%. DEFCON-bonus 0→25% (DEFCON 1) ned til 0% (DEFCON 5).
  - **Guidance fault**: 10% sjanse for at treffet drifter til nærmeste by (<60u) i samme nasjon.
  - **Direct hit**: skade = min(pop, yield). Fallout +ceil(yield/20), maks 3.
  - **Collateral**: byer i samme nasjon innenfor 55u får (yield*0.25 * falloff) skade og +1 fallout.
  - Loggen skiller `alert` (direkte treff), `warn` (drift/kollateral/propaganda) og `info` (avbrutt/intercept).
- `resolvePropaganda` skilt ut; logger "no living audience" hvis mål er tomt.
- Reglene: nøytralitet håndheves som friendly-fire-vern; forsvar er passiv DEFCON-basert SAM-avskjæring; ruiner kan ikke re-targetes.

## Fase 5 — Ekte kortspill + humor (nå)

- **Kortmodell utvidet**: `Card = PopulationCard | WeaponCard | SecretCard`. Én felles stokk, håndgrense 6.
- **Populasjonskort** (~40% av stokken): absurde grupper (`3M RETIRED CIRCUS CLOWNS`, `12M REALITY-TV FANATICS`), spilles gratis, distribueres på egne byer.
- **Våpenkort** (~45%): humor-oppgraderte navn (`MIRV-Y CHRISTMAS`, `DR. STRANGELOVE MK IV`, `POSEIDON'S REGRET`).
- **Secrets** (~15%): 8 typer — PROPAGANDA COUP, DEFECTOR (stjeler et fiendekort), TOP SECRET LEAK (kasserer motstanderens sterkeste warhead), ABM SHIELD (persistent intercept-token), SUPER-GERM (fallout på tilfeldig by), WORLD OPINION (alle taper 5M), ACCIDENT (deg selv i foten), DETERRENT POLICY (+shield, DEFCON ned).
- **Turloop**: DRAW → ORDERS (kø) → RESOLVE (pop → secrets → propaganda → launches) → FALLOUT → RETALIATE.
- **Action budget** utvidet: 1 diplomacy, 2 launches, 1 secret + ubegrenset pop-plays.
- **Tabloid-humor** i telex: `MOSCOW VAPORIZED. FILM AT 11.`, `PRESIDENT UNAVAILABLE FOR COMMENT (DECEASED).`
- **UX**: onboarding-briefing (localStorage-dismissible), pulserende "ARMED" badge over kartet når våpen valgt, målvelger for secrets som krever mål, dramatisk avslørings-banner ved secret play.
- **Nye filer**: `src/game/secrets.ts`, `src/game/engine-utils.ts`. `types.ts`, `cards.ts`, `engine.ts`, `ai.ts`, `play.tsx`, `rules.tsx` alle omskrevet.
- Typecheck grønn.

## Gauntlet-løp — sluttføring
- Seedet PRNG (`src/game/rng.ts`) styrer nå kamp, AI, hemmeligheter og kortstokk;
  `state.seed` vises i TELEX-feeden og gjør runder reproduserbare.
- Én kanonisk regelvei i `engine.ts`; legacy simultanoppløsning fjernet.
- Final Retaliation animeres sekvensielt som vanlige angrep.
- `src/lib/scheduler.ts` gjør pause/hastighet synkront for animasjon, tilstand og lyd.
- UI: kompakte håndkort (108×92), ettlinjes handlingsbudsjett, TELEX synlig uten
  scroll på 1440×900; `data-city` lagt til for testbar bytreffing.
- Verifisert: 19/19 vitest, typecheck ren, nettleserflyt POP → arm → Moskva
  (4.9 s til treff) → AI-sekvens → tur 2, DEFCON 2, null konsollfeil.
  Ingen horisontal overflow på 1440×900, 768×1024, 390×844.

## Pause-fidelity fix (missile completion timer)
- `MissileLayerInner` armed two competing completion timers (mount effect + pause effect),
  so pausing cleared only one and the salvo resolved on wall-clock time while frozen.
- Rewritten as one salvo-reset effect (`flightsKey`/`total`) plus one run effect whose
  cleanup banks the elapsed remainder; a `firedRef` guard makes `onComplete` fire once.
- Verified in-browser: warhead frozen while paused, no resolution during pause,
  ~3.9 s of flight remaining resumed exactly after a 2.5 s pause, controls not locked,
  zero console errors. 28/28 unit tests pass.

## Fase 1 — motorsannhet og komplett kampflyt
- `applyLaunch` returnerer nå `LaunchResult`; UI animerer til faktisk nedslagsby
  (styringsfeil merkes `(DRIFT)`) i stedet for å gjette ut fra befolkningsdiff.
- Befolkningskort deler ut hele beløpet (25M-kortet mistet før 5M).
- `groupRetaliations`: flere utslåtte nasjoner gir én banner + salvo per nasjon,
  sekvensielt og deterministisk.
- Klaxon går via `clock().after()` (`sfx.klaxonCycle`), så pause stopper også lyd.
- `/play?seed=<n>` gir reproduserbare kjøringer.
- Tester: 37 vitest (`bun run test`) + `bun run test:e2e` (Playwright, 7/7 sjekker,
  null konsollfeil, AI-rekkefølge USSR → CHINA, pause fryser stridshodet).
