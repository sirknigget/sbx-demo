export type Counters = { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number };
export type Activity = {
  id: string;
  kind: "run" | "turn" | "tool" | "message";
  label: string;
  start: number;
  end?: number;
  duration?: number;
  status: "running" | "success" | "error";
  usage?: Counters;
};

const zero = (): Counters => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 });

export class DashboardState {
  model = "—";
  totals = zero();
  activities: Activity[] = [];
  private sequence = 0;
  private listeners = new Set<(snapshot: ReturnType<DashboardState["snapshot"]>) => void>();

  snapshot() {
    return { model: this.model, totals: { ...this.totals }, activities: this.activities.map((item) => ({ ...item })) };
  }
  subscribe(listener: (snapshot: ReturnType<DashboardState["snapshot"]>) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private publish() {
    const data = this.snapshot();
    for (const listener of this.listeners) listener(data);
  }
  setModel(model: string) {
    this.model = model;
    this.publish();
  }
  start(kind: Activity["kind"], label: string, id = `${kind}:${++this.sequence}`, start = Date.now()) {
    this.activities.unshift({ id, kind, label, start, status: "running" });
    this.activities.length = Math.min(this.activities.length, 200);
    this.publish();
    return id;
  }
  end(id: string, status: "success" | "error", end = Date.now()) {
    const item = this.activities.find((entry) => entry.id === id);
    if (!item || item.status !== "running") return;
    item.end = end;
    item.duration = Math.max(0, end - item.start);
    item.status = status;
    this.publish();
  }
  message(model: string, usage: Counters, status: "success" | "error", start: number, end = Date.now()) {
    this.model = model;
    for (const key of Object.keys(this.totals) as (keyof Counters)[]) this.totals[key] += usage[key] ?? 0;
    const id = this.start("message", model, undefined, start);
    const item = this.activities.find((entry) => entry.id === id)!;
    item.usage = { ...usage };
    this.end(id, status, end);
  }
}
