interface Props {
  step: 1 | 2 | 3;
  hint: string;
}

const STEPS: { n: 1 | 2 | 3; label: string }[] = [
  { n: 1, label: "PLAY CARD" },
  { n: 2, label: "PICK TARGET" },
  { n: 3, label: "END TURN" },
];

export function StepGuide({ step, hint }: Props) {
  return (
    <div className="terminal-panel rounded-sm p-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] sm:text-[10px] sm:tracking-[0.22em]">
        {STEPS.map((s, i) => {
          const active = s.n === step;
          const done = s.n < step;
          return <div key={s.n} className="flex flex-1 items-center gap-1">
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center border ${active ? "border-alert bg-alert/20 text-alert text-glow-alert animate-pulse" : done ? "border-phosphor bg-phosphor/20 text-phosphor" : "border-phosphor/40 text-phosphor-dim"}`}>{done ? "✓" : s.n}</span>
            <span className={`whitespace-nowrap ${active ? "text-alert text-glow-alert" : done ? "text-phosphor" : "text-phosphor-dim"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 hidden flex-1 border-t border-dashed border-phosphor/30 sm:block" />}
          </div>;
        })}
      </div>
      <div className="mt-2 border-t border-phosphor/20 pt-2 text-[11px] leading-snug text-amber text-glow-amber">&gt; {hint}</div>
    </div>
  );
}