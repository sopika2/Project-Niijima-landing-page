// Runtime config: /config/site.yaml + the services list, fetched on every page load.
// Edit the files (Docker mounts the folder) and reload — no rebuild. JSON is accepted too.
// Older keys from the first version of this repo (name/subtitle/patron/ready/image.desktop) still work.

import { parse } from "yaml";
import type { NjConfig, NjEntry, NjSister, Status } from "./niijima/niijima.d";

export interface LoaderConfig {
  type: "image" | "gif" | "sprite" | "video" | "none";
  src?: string;
  frames: number;
  fps: number;
  size: number;
  text: string;
  minDuration: number;
}

export interface SiteConfig {
  domain: string;
  title: string;
  edge: "torn" | "clean";
  sisterOpens: "network" | "site";
  sisters: NjSister[];
  loader: LoaderConfig;
  calendar: { timezone?: string; weather: boolean; latitude: number; longitude: number };
  status: { kuma: string; interval: number; ping: boolean };
  sounds: Record<string, string>;
  soundVolume: number;
  credit?: string;
  servicesSource: string;
}

type Raw = Record<string, any>;
const STATUSES: Status[] = ["online", "down", "pending", "maintenance", "soon", "locked"];

export async function fetchYaml<T = Raw>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    return (url.endsWith(".json") || /^\s*[[{]/.test(text) ? JSON.parse(text) : parse(text)) as T;
  } catch (err) {
    console.warn(`[niijima] couldn't read ${url}:`, err);
    return null;
  }
}

const hostOf = (url?: string) => {
  if (!url) return undefined;
  try { return new URL(url, location.href).host; } catch { return undefined; }
};
const accentOf = (v: unknown) => (v === "makoto" || v === "sae" ? v : undefined);
const statusOf = (v: unknown) => (STATUSES.includes(v as Status) ? (v as Status) : undefined);

const SISTER_DEFAULTS: Record<string, Partial<NjSister>> = {
  makoto: { name: "MAKOTO", accent: "makoto", arcana: "II", plates: ["Codename · Queen", "II · Priestess"], tagline: "Council president. Strategist. Iron fist.", renderFlip: true },
  sae: { name: "SAE", accent: "sae", arcana: "XX", glyph: "§", plates: ["Public prosecutor", "XX · Judgement"], tagline: "The prosecution never rests." },
};

function sister(id: string, r: Raw, domain: string): NjSister {
  const d = SISTER_DEFAULTS[id] ?? {};
  const host = r.host ?? hostOf(r.url) ?? `${id}.${domain}`;
  const legacyPlates = r.codename || r.arcana && !/^[0IVXL]+$/.test(r.arcana) ? [r.codename && `Codename · ${r.codename}`, r.arcana && `${d.arcana ?? ""} · ${r.arcana}`].filter(Boolean) : undefined;
  return {
    ...d,
    id,
    name: String(r.name ?? d.name ?? id).toUpperCase(),
    host,
    url: r.url,
    status: statusOf(r.status) ?? (r.ready === false ? "soon" : r.ready === true ? "online" : "soon"),
    accent: accentOf(r.accent) ?? d.accent,
    arcana: r.arcana && /^[0IVXL]+$/.test(r.arcana) ? r.arcana : d.arcana,
    glyph: r.glyph ?? d.glyph,
    plates: Array.isArray(r.plates) ? r.plates : legacyPlates ?? d.plates,
    tagline: r.tagline ?? d.tagline,
    render: r.render ?? r.image?.desktop,
    renderFit: r.renderFit === "cover" ? "cover" : undefined,
    renderFlip: r.renderFlip ?? d.renderFlip,
  };
}

export async function loadSite(): Promise<SiteConfig> {
  const raw: Raw = (await fetchYaml("/config/site.yaml")) ?? {};
  const domain: string = raw.domain ?? location.hostname.replace(/^www\./, "");
  const rs = raw.sisters ?? {};
  const list: [string, Raw][] = Array.isArray(rs) ? rs.map((s: Raw) => [s.id, s]) : Object.entries(rs);
  const sisters = (list.length ? list : [["makoto", {}], ["sae", {}]] as [string, Raw][]).slice(0, 2).map(([id, r]) => sister(id, r ?? {}, domain));
  const st = raw.status ?? {};
  return {
    domain,
    title: raw.title ?? "Niijima Network",
    edge: raw.edge === "clean" ? "clean" : "torn",
    sisterOpens: raw.sisterOpens === "site" ? "site" : "network",
    sisters,
    loader: { type: "none", frames: 1, fps: 24, size: 160, text: "Take your time", minDuration: 900, ...(raw.loader ?? {}) },
    calendar: { weather: false, latitude: 47.4979, longitude: 19.0402, ...(raw.calendar ?? {}) },
    status: {
      kuma: st.kuma ?? "",
      interval: Math.max(15, Number(st.interval) || 60),
      ping: st.ping ?? raw.statusChecks ?? true,
    },
    sounds: raw.sounds ?? {},
    soundVolume: raw.soundVolume ?? 0.6,
    credit: raw.credit,
    servicesSource: raw.servicesSource ?? "/config/services.yaml",
  };
}

export async function loadServices(source: string, domain: string): Promise<NjEntry[]> {
  const raw = await fetchYaml<Raw>(source);
  const list: Raw[] = Array.isArray(raw) ? raw : raw?.services ?? [];
  return list
    .filter((s) => s && !s.hidden && (s.label || s.name))
    .map((s, i): NjEntry => ({
      id: String(s.id ?? `entry-${i}`),
      label: String(s.label ?? s.name),
      host: s.host ?? hostOf(s.url) ?? (s.status === "locked" || !s.id ? undefined : `${s.id}.${domain}`),
      url: s.url,
      hint: s.hint ?? s.subtitle,
      status: statusOf(s.status) ?? "online",
      accent: accentOf(s.accent ?? s.patron),
      monitorId: s.monitorId ?? null,
      check: s.check ?? s.status !== false,
      arcana: s.arcana,
      arcanaName: s.arcanaName,
      desc: s.desc ?? s.description,
      render: s.render,
      renderFit: s.renderFit === "cover" ? "cover" : undefined,
      renderFlip: s.renderFlip,
    }));
}

export function toNiijima(site: SiteConfig, network: NjEntry[]): NjConfig {
  return { sisters: site.sisters, network, sounds: site.sounds, soundVolume: site.soundVolume, sisterOpens: site.sisterOpens };
}
