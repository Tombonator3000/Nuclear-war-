import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CRTScreen } from "@/components/crt/CRTScreen";
import { DEFAULT_OPTIONS, loadOptions, saveOptions, type Options } from "@/lib/game-storage";

export const Route = createFileRoute("/options")({
  component: OptionsPage,
  head: () => ({ meta: [{ title: "Options — Nuclear War WOPR" }, { name: "description", content: "System preferences: sim speed, sound, onboarding." }] }),
});

function OptionsPage() {
  const [opts, setOpts] = useState<Options>(DEFAULT_OPTIONS);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setOpts(loadOptions()); }, []);

  function update<K extends keyof Options>(k: K, v: Options[K]) {
    const next = { ...opts, [k]: v };
    setOpts(next);
    saveOptions(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 900);
  }

  function resetHelp() {
    try { localStorage.removeItem("nw-help-dismissed"); } catch { /* ignore */ }
    update("showHelp", true);
  }

  return (
    <CRTScreen>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-phosphor-dim"><Link to="/" className="hover:text-phosphor">&lt; MAIN MENU</Link><span className="text-glow text-phosphor">SYSTEM OPTIONS</span><span>{saved ? "SAVED" : "\u00A0"}</span></header>
        <section className="terminal-panel rounded-sm p-6">
          <h1 className="display text-2xl text-phosphor text-glow">SYSTEM PREFERENCES</h1>
          <div className="mt-6 space-y-6 font-mono text-sm text-phosphor">
            <div><div className="text-phosphor-dim uppercase tracking-widest text-xs">DEFAULT SIM SPEED</div><div className="mt-2 flex gap-2">{([1, 0.5, 0.25] as const).map((s) => { const active = opts.animSpeed === s; const label = s === 1 ? "1× REAL-TIME" : s === 0.5 ? "½× SLOW" : "¼× BULLET-TIME"; return <button key={s} type="button" onClick={() => update("animSpeed", s)} className={`border px-3 py-1 text-xs uppercase tracking-widest ${active ? "border-phosphor bg-phosphor/20 text-phosphor text-glow" : "border-phosphor/40 bg-black/60 text-phosphor/70 hover:bg-phosphor/10"}`}>{label}</button>; })}</div></div>
            <div><div className="text-phosphor-dim uppercase tracking-widest text-xs">CONSOLE AUDIO</div><div className="mt-2 flex gap-2">{[true, false].map((v) => <button key={String(v)} type="button" onClick={() => update("soundOn", v)} className={`border px-3 py-1 text-xs uppercase tracking-widest ${opts.soundOn === v ? "border-phosphor bg-phosphor/20 text-phosphor text-glow" : "border-phosphor/40 bg-black/60 text-phosphor/70 hover:bg-phosphor/10"}`}>{v ? "ON" : "OFF"}</button>)}</div><p className="mt-1 text-[10px] uppercase tracking-widest text-phosphor-dim">(Syntesert klaxon, oppskyting og nedslag — retro WOPR-bleeps.)</p></div>
            <div><div className="text-phosphor-dim uppercase tracking-widest text-xs">ONBOARDING HINTS</div><button type="button" onClick={resetHelp} className="mt-2 border border-phosphor/40 bg-black/60 px-3 py-1 text-xs uppercase tracking-widest text-phosphor/70 hover:bg-phosphor/10">RESET FIRST-RUN TOOLTIP</button></div>
          </div>
        </section>
      </main>
    </CRTScreen>
  );
}