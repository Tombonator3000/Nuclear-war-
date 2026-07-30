import { beforeEach, describe, expect, it, vi } from "vitest";
import { Scheduler } from "../src/lib/scheduler";

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as unknown as { window: unknown }).window = {
    setTimeout: (fn: () => void, ms?: number) => globalThis.setTimeout(fn, ms),
    clearTimeout: (h: unknown) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
  };
});

describe("pause-aware scheduler", () => {
  it("does not fire while paused and still fires exactly once after resume", () => {
    const s = new Scheduler();
    const fn = vi.fn();
    s.after(1000, fn);
    vi.advanceTimersByTime(400);
    s.pause();
    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
    s.resume();
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("never double-fires across repeated pause/resume cycles", () => {
    const s = new Scheduler();
    const fn = vi.fn();
    s.after(500, fn);
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(50);
      s.pause();
      vi.advanceTimersByTime(1000);
      s.resume();
    }
    vi.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("clear() drops pending work so a restart cannot resolve an old flight", () => {
    const s = new Scheduler();
    const fn = vi.fn();
    s.after(100, fn);
    s.clear();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("keeps sleep() ordering stable under pause", async () => {
    const s = new Scheduler();
    const order: string[] = [];
    const p = (async () => {
      await s.sleep(100);
      order.push("a");
      await s.sleep(100);
      order.push("b");
    })();
    s.pause();
    await vi.advanceTimersByTimeAsync(500);
    expect(order).toEqual([]);
    s.resume();
    await vi.advanceTimersByTimeAsync(100);
    expect(order).toEqual(["a"]);
    await vi.advanceTimersByTimeAsync(100);
    await p;
    expect(order).toEqual(["a", "b"]);
  });
});
