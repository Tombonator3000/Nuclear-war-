import { loadOptions } from "./game-storage";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function enabled(): boolean {
  try { return loadOptions().soundOn; } catch { return false; }
}

function env(node: AudioNode, now: number, attack: number, decay: number, peak = 1, sustain = 0, release = 0.05): GainNode {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + attack);
  g.gain.linearRampToValueAtTime(sustain, now + attack + decay);
  g.gain.linearRampToValueAtTime(0, now + attack + decay + release);
  node.connect(g);
  g.connect(master!);
  return g;
}

function tone(freq: number, type: OscillatorType, when: number, dur: number, peak = 0.4, freqEnd?: number) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), when + dur);
  const g = env(osc, when, 0.005, dur * 0.5, peak, peak * 0.3, dur * 0.5);
  osc.start(when);
  osc.stop(when + dur + 0.1);
  return g;
}

function noiseBuffer(duration = 1): AudioBuffer {
  const c = ensureCtx()!;
  const b = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function noiseBurst(when: number, dur: number, peak = 0.5, lowpass = 800) {
  const c = ensureCtx();
  if (!c) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(Math.max(0.2, dur));
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(lowpass, when);
  filt.frequency.exponentialRampToValueAtTime(Math.max(40, lowpass * 0.15), when + dur);
  src.connect(filt);
  env(filt, when, 0.005, dur * 0.4, peak, peak * 0.15, dur * 0.6);
  src.start(when);
  src.stop(when + dur + 0.1);
}

export function click() {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  tone(880, "square", c.currentTime, 0.05, 0.15);
}

export function beep(freq = 660) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  tone(freq, "square", c.currentTime, 0.08, 0.2);
}

export function launch(delayMs = 0) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + delayMs / 1000;
  tone(120, "sawtooth", t, 0.6, 0.28, 480);
  noiseBurst(t, 0.5, 0.35, 1200);
}

export function impact(delayMs = 0) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + delayMs / 1000;
  tone(60, "sine", t, 1.1, 0.55, 22);
  tone(90, "triangle", t + 0.02, 0.8, 0.35, 30);
  noiseBurst(t, 1.0, 0.7, 2400);
  noiseBurst(t + 0.15, 0.9, 0.45, 400);
}

export function intercept(delayMs = 0) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + delayMs / 1000;
  tone(1400, "square", t, 0.12, 0.2, 600);
  noiseBurst(t, 0.2, 0.3, 3000);
}

export function klaxonCycle() {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(440, "square", t, 0.35, 0.3);
  tone(330, "square", t + 0.35, 0.35, 0.3);
}

export function klaxon(cycles = 2) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  let t = c.currentTime;
  for (let i = 0; i < cycles; i++) {
    tone(440, "square", t, 0.35, 0.3);
    tone(330, "square", t + 0.35, 0.35, 0.3);
    t += 0.7;
  }
}

export const KLAXON_CYCLE_MS = 700;