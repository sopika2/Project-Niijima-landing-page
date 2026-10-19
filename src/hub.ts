// The hub, built on how Persona 5's menus work:
// - screen split by a white divide: red side over a red-tinted scene, black/white patterned side
// - the patron sister straddles the divide, changing pose per highlighted item
// - many tight menu items in black/white collage; the selected one grows, re-cuts in red,
//   and sits on a jittering red/cyan highlight that keeps re-shaping
// - info lives in angular black panels with white outlines; descriptions in a clean italic sans
// - motion: heartbeat pulse, white flash frames, small screen shakes, staggered entrances

import type { Service, SiteConfig, SisterId } from "./config";
import { createCalendar } from "./calendar";
import { ransom } from "./ransom";

export interface Hub {
  el: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setServices(list: Service[]): void;
  key(e: KeyboardEvent): boolean;
}

type State = "checking" | "online" | "offline" | "off";

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const OFFSETS = [0.3, 1.4, 0.6, 1.9, 0.9, 2.3, 0.2, 1.6, 1.1]; // irregular left edge, in em

export function createHub(site: SiteConfig, onGo: (s: Service) => void, onClose: () => void): Hub {
  const el = document.createElement("section");
  el.className = "hub";
  el.dataset.figure = site.hubFigure;
  el.setAttribute("aria-label", "Niijima Network menu");
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
  el.innerHTML = `
    <div class="hub__bg" aria-hidden="true">
      <div class="hub__scene"><div class="hub__scene-img"></div><div class="hub__scene-tint"></div></div>
      <div class="hub__mono"><div class="hub__mono-dots"></div></div>
      <div class="hub__divide"></div>
      <div class="hub__grain"></div>
    </div>
    <div class="hub__figure" aria-hidden="true"><div class="hub__pose"></div></div>
    <div class="hub__cal"></div>
    <div class="hub__status" aria-hidden="true">
      <div class="status__head"></div>
      <ul class="status__rows"></ul>
    </div>
    <nav class="hub__menu" aria-label="Services"><ul></ul></nav>
    <div class="hub__desc" aria-live="polite">
      <div class="desc__name"></div>
      <p class="desc__text"></p>
      <span class="desc__host"></span>
    </div>
    <div class="hub__hints">
      <button type="button" class="hint hint--back"><kbd>Esc</kbd><span>Back</span></button>
      <button type="button" class="hint hint--go"><kbd>Enter</kbd><span>Go</span></button>
    </div>
    <div class="hub__flash" aria-hidden="true"></div>`;

  // Scene behind the menu (tinted red by CSS). Missing file → plain red scene.
  if (site.hubBackdrop) {
    const probe = new Image();
    probe.onload = () => {
      el.querySelector<HTMLElement>(".hub__scene-img")!.style.backgroundImage = `url("${site.hubBackdrop}")`;
      el.classList.add("has-scene");
    };
    probe.src = site.hubBackdrop;
  }

  el.querySelector(".hub__cal")!.append(createCalendar(site.calendar));
  el.querySelector(".status__head")!.append(ransom("NETWORK", { palette: "red", seed: "status-head" }));
  el.querySelector(".hint--back")!.addEventListener("click", () => onClose());
  el.querySelector(".hint--go")!.addEventListener("click", () => {
    if (services[index]) onGo(services[index]);
  });

  const ul = el.querySelector<HTMLElement>(".hub__menu ul")!;
  const rows = el.querySelector<HTMLElement>(".status__rows")!;
  const figure = el.querySelector<HTMLElement>(".hub__figure")!;
  const pose = el.querySelector<HTMLElement>(".hub__pose")!;
  const flash = el.querySelector<HTMLElement>(".hub__flash")!;
  const desc = el.querySelector<HTMLElement>(".hub__desc")!;

  let services: Service[] = [];
  let items: HTMLAnchorElement[] = [];
  let index = -1;
  let cuts = 0;
  let open = false;

  // ── Figure ───────────────────────────────────────────────────
  const imgCache = new Map<string, Promise<HTMLImageElement | null>>();
  const loadImg = (src?: string) => {
    if (!src) return Promise.resolve(null);
    if (!imgCache.has(src)) {
      imgCache.set(
        src,
        new Promise((res) => {
          const img = new Image();
          img.decoding = "async";
          img.alt = "";
          img.onload = () => res(img);
          img.onerror = () => res(null);
          img.src = src;
        }),
      );
    }
    return imgCache.get(src)!;
  };

  let poseToken = 0;
  async function showPose(s: Service) {
    const token = ++poseToken;
    const sister: SisterId = s.patron ?? "makoto";
    const art = site.sisters[sister];
    const found = (await loadImg(s.pose)) ?? (await loadImg(art.image.desktop));
    if (token !== poseToken) return;
    pose.replaceChildren();
    if (found) {
      pose.append(found.cloneNode() as HTMLImageElement);
      pose.classList.remove("is-placeholder");
    } else {
      pose.classList.add("is-placeholder");
      pose.innerHTML = `<div class="placeholder"><span>${art.name}: ${s.name} pose</span><code>${s.pose ?? art.image.desktop ?? "/assets/…"}</code></div>`;
    }
    el.dataset.patron = sister;
    if (!reduceMotion()) {
      figure.animate(
        [
          { transform: "translateX(5%)", filter: "brightness(5)" },
          { transform: "translateX(-1%)", filter: "brightness(1)", offset: 0.4 },
          { transform: "none" },
        ],
        { duration: 220, easing: "steps(5, end)" },
      );
    }
  }

  // ── Description panel ────────────────────────────────────────
  function showDesc(s: Service) {
    desc.querySelector(".desc__name")!.replaceChildren(ransom(s.name.toUpperCase(), { palette: "red", seed: `desc-${s.id}` }));
    desc.querySelector(".desc__text")!.textContent = s.description ?? s.subtitle ?? "";
    desc.querySelector(".desc__host")!.textContent = new URL(s.url, location.href).host;
    if (!reduceMotion()) {
      desc.animate(
        [
          { transform: "translateY(0.6rem) rotate(-1deg)" },
          { transform: "translateY(-0.2rem) rotate(-3.5deg)", offset: 0.5 },
          { transform: "rotate(-2.5deg)" },
        ],
        { duration: 200, easing: "steps(4, end)" },
      );
    }
  }

  // ── Selection highlight: two polygons re-shaped every ~120ms ─
  const jitter = (base: number[][], amt: number) =>
    base.map(([x, y]) => `${(x + (Math.random() - 0.5) * amt).toFixed(1)},${(y + (Math.random() - 0.5) * amt).toFixed(1)}`).join(" ");
  const RED = [[0, 6], [88, 0], [100, 15], [90, 30], [4, 27]];
  const CYAN = [[-3, 10], [84, 5], [104, 19], [92, 35], [1, 33]];
  function reshape() {
    const a = items[index];
    if (!a) return;
    a.querySelector(".cursor__red")!.setAttribute("points", jitter(RED, 5));
    a.querySelector(".cursor__cyan")!.setAttribute("points", jitter(CYAN, 7));
  }
  setInterval(() => {
    if (open && !reduceMotion()) reshape();
  }, 120);

  function letter(a: HTMLAnchorElement, s: Service, selected: boolean) {
    a.querySelector(".item__collage")!.replaceChildren(
      selected
        ? ransom(s.name.toUpperCase(), { palette: "red", seed: `item-${s.id}-${cuts}`, mixCase: true, wild: true })
        : ransom(s.name.toUpperCase(), { palette: "mono", seed: `item-${s.id}`, mixCase: true, wild: true }),
    );
  }

  function select(i: number, focusIt = true) {
    if (!items.length) return;
    const next = (i + items.length) % items.length;
    if (focusIt) items[next].focus({ preventScroll: true });
    if (next === index) return;
    const prev = index;
    index = next;
    cuts++;
    items.forEach((a, j) => a.classList.toggle("is-selected", j === index));
    if (prev >= 0) letter(items[prev], services[prev], false);
    letter(items[index], services[index], true);
    reshape();
    if (!reduceMotion() && prev >= 0) {
      // one white frame + a tiny shake, like a hit
      flash.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 90, easing: "steps(2, end)" });
      el.animate(
        [{ translate: "0 0" }, { translate: "4px -3px" }, { translate: "-3px 2px" }, { translate: "0 0" }],
        { duration: 110, easing: "steps(4, end)" },
      );
    }
    showPose(services[index]);
    showDesc(services[index]);
  }

  // ── Status panel ─────────────────────────────────────────────
  function statusRow(s: Service): HTMLElement {
    const li = document.createElement("li");
    li.className = "status__row";
    li.innerHTML = `<span class="status__name"></span><span class="status__bar"><i></i></span><span class="status__word"></span>`;
    li.querySelector(".status__name")!.textContent = s.name;
    return li;
  }
  function setState(li: HTMLElement, st: State) {
    li.dataset.state = st;
    li.querySelector(".status__word")!.textContent = st === "online" ? "ONLINE" : st === "offline" ? "DOWN" : st === "checking" ? "…" : "";
  }

  function setServices(list: Service[]) {
    services = list;
    ul.replaceChildren();
    rows.replaceChildren();
    items = [];
    index = -1;
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "hub__empty";
      li.textContent = "No services yet. Add one in config/services.yaml.";
      ul.append(li);
      return;
    }
    list.forEach((s, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", String(i));
      li.style.setProperty("--off", `${OFFSETS[i % OFFSETS.length]}em`);
      const a = document.createElement("a");
      a.className = "item";
      a.href = s.url;
      a.setAttribute("aria-label", s.subtitle ? `${s.name}, ${s.subtitle}` : s.name);
      a.innerHTML = `
        <svg class="item__cursor" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <polygon class="cursor__cyan" points="-3,10 84,5 104,19 92,35 1,33"/>
          <polygon class="cursor__red" points="0,6 88,0 100,15 90,30 4,27"/>
        </svg>
        <span class="item__collage" aria-hidden="true"></span>`;
      letter(a, s, false);
      a.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") select(i, false);
      });
      a.addEventListener("focus", () => select(i, false));
      a.addEventListener("click", (e) => {
        e.preventDefault();
        if (index !== i) {
          select(i, false); // touch: first tap selects, second goes
          return;
        }
        onGo(s);
      });
      li.append(a);
      ul.append(li);
      items.push(a);

      const row = statusRow(s);
      rows.append(row);
      if (site.statusChecks && s.status !== false) {
        setState(row, "checking");
        check(s.url).then((ok) => setState(row, ok ? "online" : "offline"));
      } else {
        setState(row, "off");
      }
    });
    select(0, false);
  }

  return {
    el,
    isOpen: () => open,
    setServices,
    open() {
      if (open) return;
      open = true;
      el.inert = false;
      el.setAttribute("aria-hidden", "false");
      el.classList.remove("is-closing");
      el.classList.add("is-open");
      if (!reduceMotion()) flash.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 160, delay: 300, easing: "steps(3, end)" });
      if (index >= 0) setTimeout(() => items[index]?.focus({ preventScroll: true }), 60);
    },
    close() {
      if (!open) return;
      open = false;
      el.inert = true;
      el.setAttribute("aria-hidden", "true");
      el.classList.add("is-closing");
      el.classList.remove("is-open");
      setTimeout(() => el.classList.remove("is-closing"), 520);
    },
    key(e) {
      if (!open) return false;
      if (e.key === "ArrowDown" || e.key === "s") select(index + 1);
      else if (e.key === "ArrowUp" || e.key === "w") select(index - 1);
      else if (e.key === "Enter" && items[index]) onGo(services[index]);
      else return false;
      return true;
    },
  };
}

// Best-effort reachability check. Cross-origin, so the status code is unreadable —
// a resolved request means the host answered, a network error means it didn't.
async function check(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
