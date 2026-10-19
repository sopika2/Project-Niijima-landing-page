// Live statuses for the Network menu.
//  1. Uptime Kuma (status.kuma in site.yaml): the public status-page JSON, real up/down/pending/maintenance.
//  2. Ping fallback (status.ping): a no-cors request to each entry. The browser can't read a cross-origin
//     status code, so "answered at all" = ONLINE and "network error / 5 s timeout" = DOWN.
// Kuma wins for entries that have a monitorId; ping covers the rest. Entries marked soon/locked are never pinged.

import type { SiteConfig } from "./config";
import type { NjEntry, NjHome, Status } from "./niijima/niijima.d";

const KUMA: Record<number, Status> = { 0: "down", 1: "online", 2: "pending", 3: "maintenance" };

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await run(ctl.signal); } finally { clearTimeout(t); }
}

async function pollKuma(url: string, items: NjEntry[]): Promise<Record<string, Status> | null> {
  try {
    const data = await withTimeout(8000, async (signal) => {
      const res = await fetch(url, { cache: "no-store", credentials: "omit", headers: { Accept: "application/json" }, signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
    const list = data?.heartbeatList ?? {};
    const map: Record<string, Status> = {};
    for (const it of items) {
      if (it.monitorId == null || it.monitorId === "") continue;
      const beats = list[String(it.monitorId)];
      if (!Array.isArray(beats) || !beats.length) continue;
      const beat = beats.reduce((a: any, b: any) => (String(b?.time) > String(a?.time) ? b : a), beats[beats.length - 1]);
      const s = KUMA[beat?.status];
      if (s) map[it.id] = s;
    }
    return Object.keys(map).length ? map : null;
  } catch (err) {
    console.warn("[niijima] Uptime Kuma unavailable:", (err as Error)?.message ?? err);
    return null;
  }
}

async function ping(url: string): Promise<Status> {
  try {
    await withTimeout(5000, (signal) => fetch(url, { mode: "no-cors", cache: "no-store", credentials: "omit", signal }));
    return "online";
  } catch {
    return "down";
  }
}

const target = (it: NjEntry) => it.url || (it.host ? `https://${it.host}/` : "");
const pingable = (it: NjEntry) => it.check !== false && (it.status ?? "online") === "online" && !!target(it);

export function startStatus(site: SiteConfig, items: NjEntry[], app: NjHome) {
  const { kuma, interval, ping: usePing } = site.status;
  if (!kuma && !usePing) return;

  async function refresh() {
    const fromKuma = kuma ? await pollKuma(kuma, items) : null;
    const map: Record<string, Status> = { ...(fromKuma ?? {}) };
    if (usePing) {
      const rest = items.filter((it) => pingable(it) && !(it.id in map));
      const results = await Promise.all(rest.map((it) => ping(target(it))));
      rest.forEach((it, i) => (map[it.id] = results[i]));
    }
    app.setStatuses(map, fromKuma ? true : Object.keys(map).length ? "ping" : false);
  }

  refresh();
  setInterval(() => { if (!document.hidden) refresh(); }, interval * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
}
