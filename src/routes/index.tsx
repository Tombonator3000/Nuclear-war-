import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CRTScreen } from "@/components/crt/CRTScreen";
import { hasSave, requestNewGame } from "@/lib/game-storage";

export const Route = createFileRoute("/")({
  component: BootScreen,
  head: () => ({
    meta: [
      { title: "Nuclear War — WOPR Edition" },
      { name: "description", content: "A WarGames-styled remake of Douglas Malewicki's 1965 Nuclear War card game. NORAD terminal, four decks, absurd tabloid humor." },
      { property: "og:title", content: "Nuclear War — WOPR Edition" },
      { property: "og:description", content: "Shall we play a game? A NORAD terminal remake of Nuclear War (1965)." },
    ],
  }),
});

const BOOT_LINES = [
  "LOGON: JOSHUA",
  "CPE 1704 TKS ......... OK",
  "STRATEGIC AIR COMMAND / NORAD LINK ..... ONLINE",
  "PRIMARY SATELLITE TELEMETRY ............ NOMINAL",
  "GLOBAL THERMONUCLEAR MODEL ............. LOADED",
  "DEFCON MONITOR ......................... ACTIVE",
  "",
  "GREETINGS PROFESSOR FALKEN.",
];

function BootScreen() {
  const [shown, setShown] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [saveExists, setSaveExists] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setSaveExists(hasSave()); }, []);
  useEffect(() => {
    if (shown < BOOT_LINES.length) {
      const t = setTimeout(() => setShown((n) => n + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowMenu(true), 400);
    return () => clearTimeout(t);
  }, [shown]);

  function startNew() {
    requestNewGame();
    setSaveExists(false);
    navigate({ to: "/play" });
  }

  return (
    <CRTScreen>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-phosphor-dim">
          <span>W.O.P.R. // WAR OPERATION PLAN RESPONSE</span>
          <span className="text-alert text-glow-alert" style={{ animation: "alert-pulse 1.6s infinite" }}>DEFCON 5</span>
        </header>
        <section className="terminal-panel rounded-sm p-8">
          <h1 className="display text-4xl leading-none text-phosphor text-glow sm:text-6xl">NUCLEAR&nbsp;WAR</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.4em] text-phosphor-dim">WOPR Edition · A remake of the 1965 board game</p>
          <div className="mt-8 space-y-1 font-mono text-sm leading-relaxed">
            {BOOT_LINES.slice(0, shown).map((line, i) => <div key={i} className="text-phosphor text-glow">{line ? <>&gt; {line}</> : <>&nbsp;</>}</div>)}
            {shown < BOOT_LINES.length && <div className="text-phosphor text-glow cursor">&gt;&nbsp;</div>}
          </div>
          {showMenu && (
            <div className="mt-10 border-t border-border pt-8">
              <p className="text-phosphor text-glow display text-2xl sm:text-3xl">SHALL WE PLAY A GAME?</p>
              <ul className="mt-6 grid gap-2 sm:max-w-md">
                <li><button type="button" onClick={startNew} className="terminal-panel block w-full px-5 py-3 text-left text-sm uppercase tracking-[0.25em] text-phosphor text-glow transition hover:bg-phosphor/10">&gt; New Game — Global Thermonuclear War</button></li>
                {saveExists && <li><Link to="/play" className="terminal-panel block w-full px-5 py-3 text-sm uppercase tracking-[0.25em] text-amber text-glow-amber transition hover:bg-amber/10">&gt; Continue Simulation</Link></li>}
                <li><Link to="/highscore" className="terminal-panel block w-full px-5 py-3 text-sm uppercase tracking-[0.25em] text-phosphor-dim transition hover:text-phosphor">&gt; Highscore — Survivors Log</Link></li>
                <li><Link to="/options" className="terminal-panel block w-full px-5 py-3 text-sm uppercase tracking-[0.25em] text-phosphor-dim transition hover:text-phosphor">&gt; Options — System Preferences</Link></li>
                <li><Link to="/rules" className="terminal-panel block w-full px-5 py-3 text-sm uppercase tracking-[0.25em] text-phosphor-dim transition hover:text-phosphor">&gt; List Games / Rules</Link></li>
                <li><Link to="/credits" className="terminal-panel block w-full px-5 py-3 text-sm uppercase tracking-[0.25em] text-phosphor-dim transition hover:text-phosphor">&gt; Credits &amp; About</Link></li>
              </ul>
              <p className="mt-6 text-xs uppercase tracking-[0.35em] text-phosphor-dim">A strange game. The only winning move is not to play.</p>
            </div>
          )}
        </section>
        <footer className="mt-auto flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-phosphor-dim"><span>NORAD // CHEYENNE MOUNTAIN COMPLEX</span><span>SYS 7.4.0 · TERMINAL 24-A</span></footer>
      </main>
    </CRTScreen>
  );
}