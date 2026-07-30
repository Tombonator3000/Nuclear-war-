import type { ReactNode } from "react";

interface CRTScreenProps {
  children: ReactNode;
  className?: string;
}

export function CRTScreen({ children, className = "" }: CRTScreenProps) {
  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {children}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-40 mix-blend-multiply" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)" }} />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 z-40 h-32 opacity-30" style={{ background: "linear-gradient(180deg, transparent, oklch(0.88 0.22 145 / 0.18), transparent)", animation: "crt-scan 7s linear infinite" }} />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-40" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.85) 100%)" }} />
    </div>
  );
}