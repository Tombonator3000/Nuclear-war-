import type { Card } from "@/game/types";

interface Props {
  card: Card;
  selected: boolean;
  used: boolean;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
}

export function HandCard({ card, selected, used, disabled, disabledReason, onClick }: Props) {
  const palette = card.kind === "pop"
    ? { border: "border-phosphor/70", bg: "bg-phosphor/5", text: "text-phosphor", glow: "text-glow", tag: "POP", value: `+${card.amount}M`, hint: "HOUSE CITIZENS" }
    : card.kind === "weapon"
      ? { border: "border-alert/80", bg: "bg-alert/5", text: "text-alert", glow: "text-glow-alert", tag: card.vehicle, value: `${card.yield}MT`, hint: "PICK A TARGET →" }
      : { border: "border-amber/80", bg: "bg-amber/5", text: "text-amber", glow: "text-glow-amber", tag: "SECRET", value: "?", hint: card.flavor };

  const stateCls = used
    ? "opacity-40 grayscale line-through"
    : selected
      ? "border-alert bg-alert/15 text-alert text-glow-alert scale-[1.03] shadow-[0_0_18px_theme(colors.red.500/40%)]"
      : disabled
        ? "opacity-50 cursor-not-allowed"
        : `${palette.border} ${palette.bg} ${palette.text} ${palette.glow} hover:-translate-y-0.5 hover:shadow-[0_0_16px_currentColor] cursor-pointer`;

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={disabled && disabledReason ? disabledReason : card.kind === "secret" ? card.flavor : undefined} className={`group relative flex h-[92px] w-[108px] shrink-0 flex-col justify-between rounded-sm border-2 p-1.5 text-left transition-all duration-150 ${stateCls}`} style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 3px)" }}>
      <div className="flex items-start justify-between gap-1"><span className="display text-[9px] leading-none tracking-[0.15em] opacity-80">[{palette.tag}]</span><span className="display text-base leading-none">{palette.value}</span></div>
      <div className="display text-[11px] leading-tight">{card.name}</div>
      <div className="truncate text-[8px] uppercase tracking-[0.12em] opacity-70">{used ? "SPENT" : selected ? "ARMED — CLICK CITY" : palette.hint}</div>
      {selected && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-sm border-2 border-alert animate-pulse" />}
    </button>
  );
}