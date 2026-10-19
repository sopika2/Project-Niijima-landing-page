// Types for the design-system bundle (src/niijima/niijima.js sets window.Niijima).
export type Status = "online" | "down" | "pending" | "maintenance" | "soon" | "locked";
export type Accent = "makoto" | "sae" | undefined;

export interface NjSister {
  id: string;
  name: string;
  host?: string;
  url?: string;
  status?: Status;
  accent?: Accent;
  arcana?: string;
  glyph?: string;
  plates?: string[];
  tagline?: string;
  render?: string;
  renderFit?: "cover";
  renderFlip?: boolean;
}

export interface NjEntry {
  id: string;
  label: string;
  host?: string;
  url?: string;
  hint?: string;
  status?: Status;
  accent?: Accent;
  monitorId?: number | string | null;
  check?: boolean;
  arcana?: string;
  arcanaName?: string;
  desc?: string;
  render?: string;
  renderFit?: "cover";
  renderFlip?: boolean;
}

export interface NjConfig {
  sisters: NjSister[];
  network: NjEntry[];
  sounds?: Record<string, string>;
  soundVolume?: number;
  sisterOpens?: "network" | "site";
}

export interface NjHomeOptions {
  edge?: "torn" | "clean";
  tearSeed?: string;
  timezone?: string;
  weather?: { latitude: number; longitude: number } | null;
  credit?: string;
  navigate?: (url: string, item: NjEntry | NjSister, wipe: HTMLElement | null) => void;
}

export interface NjHome {
  setStatuses(map: Record<string, Status>, live: boolean | "ping"): void;
}

export interface NiijimaApi {
  version: string;
  home(target: HTMLElement, cfg: NjConfig, opts?: NjHomeOptions): NjHome;
  ransom(target: HTMLElement, text: string, opts?: { tiles?: string[]; seed?: string; tilt?: number; size?: number | string; animate?: boolean; first?: number; stagger?: number }): HTMLElement;
  buttonHTML(label: string, opts?: { href?: string; variant?: string; attrs?: string; span?: boolean; down?: boolean }): string;
  sfx: { play(name: string): void; isMuted(): boolean };
}

declare global {
  interface Window {
    Niijima: NiijimaApi;
  }
}
