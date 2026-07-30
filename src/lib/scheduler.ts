/** Pause-aware timing used by the play screen. */
interface PendingTask {
  id: number;
  fn: () => void;
  remaining: number;
  handle: number | null;
}

export class Scheduler {
  private tasks = new Map<number, PendingTask>();
  private nextId = 1;
  private paused = false;
  private lastResume = 0;

  constructor() {
    this.lastResume = typeof performance !== "undefined" ? performance.now() : 0;
  }

  private now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  after(ms: number, fn: () => void): () => void {
    const id = this.nextId++;
    const task: PendingTask = { id, fn, remaining: Math.max(0, ms), handle: null };
    this.tasks.set(id, task);
    if (!this.paused) this.arm(task);
    return () => this.cancel(id);
  }

  sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.after(ms, resolve);
    });
  }

  private arm(task: PendingTask) {
    const startedAt = this.now();
    task.handle = window.setTimeout(() => {
      this.tasks.delete(task.id);
      task.fn();
    }, task.remaining);
    (task as PendingTask & { startedAt: number }).startedAt = startedAt;
  }

  private cancel(id: number) {
    const task = this.tasks.get(id);
    if (!task) return;
    if (task.handle != null) window.clearTimeout(task.handle);
    this.tasks.delete(id);
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    const now = this.now();
    for (const task of this.tasks.values()) {
      if (task.handle != null) window.clearTimeout(task.handle);
      const startedAt = (task as PendingTask & { startedAt?: number }).startedAt ?? now;
      task.remaining = Math.max(0, task.remaining - (now - startedAt));
      task.handle = null;
    }
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.lastResume = this.now();
    for (const task of this.tasks.values()) this.arm(task);
  }

  clear() {
    for (const task of this.tasks.values()) {
      if (task.handle != null) window.clearTimeout(task.handle);
    }
    this.tasks.clear();
  }
}