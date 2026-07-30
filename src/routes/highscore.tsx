import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CRTScreen } from "@/components/crt/CRTScreen";
import { clearHighscores, loadHighscores, type Highscore } from "@/lib/game-storage";

export const Route = createFileRoute("/highscore")({ component: HighscorePage, head: () => ({ meta: [{ title: "Highscore — Nuclear War WOPR" }, { name: "description", content: "Top ten survivors of the WOPR simulation." }] }) });

function HighscorePage() {
  const [rows, setRows] = useState<Highscore[]>([]);
  useEffect(() => { setRows(loadHighscores()); }, []);
  function nuke() { if (!confirm("Purge all highscore records?")) return; clearHighscores(); setRows([]); }
  return (
    <CRTScreen>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-phosphor-dim"><Link to="/" className="hover:text-phosphor">&lt; MAIN MENU</Link><span className="text-glow text-phosphor">SURVIVORS LOG</span><button type="button" onClick={nuke} disabled={rows.length === 0} className="text-alert text-glow-alert hover:opacity-80 disabled:opacity-30">PURGE</button></header>
        <section className="terminal-panel rounded-sm p-6">
          <h1 className="display text-2xl text-phosphor text-glow">TOP TEN SURVIVORS</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-phosphor-dim">Ranked by surviving population, then turns endured.</p>
          {rows.length === 0 ? <p className="mt-8 font-mono text-sm text-phosphor-dim">&gt; NO ARCHIVED SIMULATIONS. START A GAME TO WRITE HISTORY.</p> : <table className="mt-6 w-full font-mono text-xs text-phosphor"><thead className="text-phosphor-dim uppercase tracking-widest"><tr><th className="py-1 text-left">#</th><th className="text-left">DATE</th><th className="text-left">PLAYER</th><th className="text-left">OUTCOME</th><th className="text-right">SURVIVORS</th><th className="text-right">TURNS</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-phosphor/20"><td className="py-1">{i + 1}</td><td>{new Date(r.date).toISOString().slice(0, 10)}</td><td>{r.human}</td><td className={r.outcome === "VICTORY" ? "text-amber text-glow-amber" : r.outcome === "SURVIVED" ? "text-phosphor text-glow" : "text-alert text-glow-alert"}>{r.outcome.replace("_", " ")}</td><td className="text-right">{r.survivorPop.toLocaleString()} M</td><td className="text-right">{r.survivedTurns}</td></tr>)}</tbody></table>}
        </section>
      </main>
    </CRTScreen>
  );
}