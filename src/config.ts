import { parse } from "yaml";

export type SisterId = "makoto" | "sae";

export interface SisterImage {
  desktop?: string;
  mobile?: string;
  focusX: number;
  focusY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Sister {
  id: SisterId;
  name: string;
  surname: string;
  codename: string;
  arcana: string;
  tagline: string;
  url: string;
  ready: boolean;
  accent: string;
  image: SisterImage;
}

export interface LoaderConfig {
  type: "sprite" | "video" | "none";
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
  sisters: Record<SisterId, Sister>;
  emblem?: string;
  loader: LoaderConfig;
  calendar: { timezone: string; weather: boolean; latitude: number; longitude: number };
  statusChecks: boolean;
  servicesSource: string;
}

export interface Service {
  id: string;
  name: string;
  subtitle?: string;
  url: string;
  patron?: SisterId;
  hidden?: boolean;
  status?: boolean;
}

const DEFAULT_SISTER = (id: SisterId): Sister => ({
  id,
  name: id === "makoto" ? "Makoto" : "Sae",
  surname: "Niijima",
  codename: id === "makoto" ? "Queen" : "Prosecutor",
  arcana: id === "makoto" ? "Priestess" : "Judgement",
  tagline: "",
  url: "#",
  ready: false,
  accent: id === "makoto" ? "#3f8cff" : "#e7b544",
  image: { focusX: 50, focusY: 25, scale: 1, offsetX: 0, offsetY: 0 },
});

async function fetchYaml<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    const text = await res.text();
    // Accept JSON too, so /api/services can return plain JSON later.
    return (url.endsWith(".json") || text.trimStart().startsWith("{") ? JSON.parse(text) : parse(text)) as T;
  } catch {
    return null;
  }
}

export async function loadSite(): Promise<SiteConfig> {
  const raw = (await fetchYaml<Partial<SiteConfig> & { sisters?: Record<string, Partial<Sister>> }>("/config/site.yaml")) ?? {};
  const sister = (id: SisterId): Sister => {
    const base = DEFAULT_SISTER(id);
    const r: Partial<Sister> = raw.sisters?.[id] ?? {};
    return { ...base, ...r, id, image: { ...base.image, ...(r.image ?? {}) } };
  };
  return {
    domain: raw.domain ?? location.hostname,
    title: raw.title ?? "Niijima Network",
    sisters: { makoto: sister("makoto"), sae: sister("sae") },
    emblem: raw.emblem || undefined,
    loader: {
      type: "none",
      frames: 1,
      fps: 24,
      size: 160,
      text: "Take your time",
      minDuration: 900,
      ...(raw.loader ?? {}),
    },
    calendar: {
      timezone: "Europe/Budapest",
      weather: false,
      latitude: 47.4979,
      longitude: 19.0402,
      ...(raw.calendar ?? {}),
    },
    statusChecks: raw.statusChecks ?? true,
    servicesSource: raw.servicesSource ?? "/config/services.yaml",
  };
}

export async function loadServices(source: string): Promise<Service[]> {
  const raw = await fetchYaml<{ services?: Service[] } | Service[]>(source);
  const list = Array.isArray(raw) ? raw : raw?.services ?? [];
  return list.filter((s) => s && s.name && s.url && !s.hidden);
}
