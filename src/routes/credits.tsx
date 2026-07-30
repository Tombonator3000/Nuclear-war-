import { createFileRoute, Link } from "@tanstack/react-router";
import { CRTScreen } from "@/components/crt/CRTScreen";

export const Route = createFileRoute("/credits")({
  component: CreditsPage,
  head: () => ({ meta: [{ title: "Credits & About — Nuclear War WOPR" }, { name: "description", content: "Homage to Douglas Malewicki's Nuclear War (1965), Flying Buffalo, and WarGames." }] }),
});

function CreditsPage() {
  return (
    <CRTScreen>
      <main className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
        <header className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-phosphor-dim"><Link to="/" className="hover:text-phosphor">&lt; MAIN MENU</Link><span className="text-glow text-phosphor">CREDITS &amp; ABOUT</span><span>&nbsp;</span></header>
        <section className="terminal-panel rounded-sm p-6 font-mono text-sm leading-relaxed text-phosphor">
          <h1 className="display text-2xl text-phosphor text-glow">A STRANGE GAME</h1>
          <p className="mt-6">&gt; This is a fan-made homage — not an official product.</p>
          <h2 className="mt-8 text-phosphor-dim uppercase tracking-widest text-xs">INSPIRED BY</h2>
          <ul className="mt-2 space-y-1 text-phosphor">
            <li>&gt; <span className="text-glow">NUCLEAR WAR</span> (1965) — designed by Douglas Malewicki, published by Flying Buffalo.</li>
            <li>&gt; <span className="text-glow">NUCLEAR WAR</span> (1989) — Amiga adaptation by New World Computing.</li>
            <li>&gt; <span className="text-glow">WARGAMES</span> (1983) — WOPR, Joshua, and the Cheyenne Mountain aesthetic.</li>
          </ul>
          <h2 className="mt-8 text-phosphor-dim uppercase tracking-widest text-xs">THIS REMAKE</h2>
          <ul className="mt-2 space-y-1"><li>&gt; Engine, cards, secrets, humor: rewritten from scratch in TypeScript.</li><li>&gt; Populations, weapons and secrets are pastiches — no original artwork used.</li><li>&gt; Built with TanStack Start, React, and a phosphor CRT filter.</li></ul>
          <h2 className="mt-8 text-phosphor-dim uppercase tracking-widest text-xs">DISCLAIMER</h2>
          <p className="mt-2 text-phosphor-dim">&gt; Nuclear War™ is a trademark of Flying Buffalo Inc. This project is unaffiliated fan work distributed for entertainment and study.</p>
          <p className="mt-10 display text-lg text-amber text-glow-amber">THE ONLY WINNING MOVE IS NOT TO PLAY.</p>
        </section>
      </main>
    </CRTScreen>
  );
}