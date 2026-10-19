// The hub: every Niijima Network service as a menu, with the patron sister's figure
// changing pose for each highlighted item.

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

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createHub(site: SiteConfig, onGo: (s: Service) => void, onClose: () => void): Hub {
  const el = document.createElement("section");
  el.className = "hub";
  el.setAttribute("aria-label", "Niijima Network menu");
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
  el.innerHTML = `
    <div class="hub__bg" aria-hidden="true">
      <div class="hub__stripes"></div>
      <div class="hub__wedge"><div class="hub__halftone"></div></div>
      <div class="hub__rim"></div>
      <div class="hub__flash"></div>
    </div>
    <div class="hub__figure" aria-hidden="true"><div class="hub__pose"></div></div>
    <div class="hub__cal"></div>
    <button class="hub__close" type="button" aria-label="Back to the split screen"></button>
    <div class="hub__bubble" aria-live="polite">
      <div class="bubble__name"></div>
      <p class="bubble__text"></p>
      <div class="bubble__host"></div>
    </div>
    <nav class="hub__menu" aria-label="Services"><ul></ul></nav>
    <div class="hub__info" aria-hidden="true"><b class="info__count">–</b><span class="info__label">online</span></div>
    <div class="hub__keys" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd>Select</span>
      <span><kbd>Enter</kbd>Go</span>
      <span><kbd>Esc</kbd>Back</span>
    </div>`;

  el.querySelector(".hub__cal")!.append(createCalendar(site.calendar));
  el.querySelector(".hub__close")!.append(ransom("BACK", { palette: "red", seed: "back" }));
  el.querySelector(".hub__close")!.addEventListener("click", () => onClose());

  const ul = el.querySelector("ul")!;
  const figure = el.querySelector<HTMLElement>(".hub__figure")!;
  const pose = el.querySelector<HTMLElement>(".hub__pose")!;
  const flash = el.querySelector<HTMLElement>(".hub__flash")!;
  const bubble = el.querySelector<HTMLElement>(".hub__bubble")!;
  const count = el.querySelector<HTMLElement>(".info__count")!;

  let services: Service[] = [];
  let items: HTMLAnchorElement[] = [];
  let index = -1;
  let open = false;
  const states = new Map<string, "checking" | "online" | "offline" | "off">();

  // ── Figure: pose → patron art → labelled placeholder ─────────
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
      const img = found.cloneNode() as HTMLImageElement;
      pose.append(img);
      pose.classList.remove("is-placeholder");
    } else {
      pose.classList.add("is-placeholder");
      pose.innerHTML = `<div class="placeholder"><span>${art.name} · ${s.name} pose</span><code>${s.pose ?? art.image.desktop ?? "/assets/…"}</code></div>`;
    }
    el.dataset.patron = sister;
    el.style.setProperty("--accent", art.accent);
    if (!reduceMotion()) {
      figure.animate(
        [
          { transform: "translateX(-6%) skewX(6deg)", filter: "brightness(3)" },
          { transform: "translateX(1%) skewX(-1deg)", filter: "brightness(1)", offset: 0.6 },
          { transform: "none", filter: "brightness(1)" },
        ],
        { duration: 300, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)" },
      );
      flash.animate(
        [
          { transform: "translateX(-120%) skewX(-24deg)", opacity: 1 },
          { transform: "translateX(160%) skewX(-24deg)", opacity: 1 },
        ],
        { duration: 260, easing: "cubic-bezier(0.7, 0, 0.3, 1)" },
      );
    }
  }

  function updateBubble(s: Service) {
    bubble.querySelector(".bubble__name")!.replaceChildren(ransom(s.name.toUpperCase(), { palette: "red", seed: `bubble-${s.id}` }));
    bubble.querySelector(".bubble__text")!.textContent = s.description ?? s.subtitle ?? "";
    bubble.querySelector(".bubble__host")!.textContent = new URL(s.url, location.href).host;
    if (!reduceMotion()) {
      bubble.animate(
        [
          { transform: "scale(0.6) rotate(-8deg)", opacity: 0 },
          { transform: "scale(1.06) rotate(-2deg)", opacity: 1, offset: 0.7 },
          { transform: "rotate(-3deg)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.3)" },
      );
    }
  }

  function select(i: number, focusIt = true) {
    if (!items.length) return;
    const next = (i + items.length) % items.length;
    if (focusIt) items[next].focus({ preventScroll: true });
    if (next === index) return;
    index = next;
    items.forEach((a, j) => a.classList.toggle("is-selected", j === index));
    showPose(services[index]);
    updateBubble(services[index]);
  }

  function refreshCount() {
    const checked = [...states.values()].filter((v) => v !== "off");
    if (!checked.length) {
      el.querySelector(".hub__info")!.setAttribute("hidden", "");
      return;
    }
    const online = checked.filter((v) => v === "online").length;
    const pending = checked.some((v) => v === "checking");
    count.textContent = pending ? "…" : `${online}/${checked.length}`;
    el.querySelector(".hub__info")!.classList.toggle("is-bad", !pending && online < checked.length);
  }

  function setServices(list: Service[]) {
    services = list;
    ul.replaceChildren();
    items = [];
    index = -1;
    states.clear();
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "hub__empty";
      li.textContent = "No services yet. Add one in config/services.yaml.";
      ul.append(li);
      refreshCount();
      return;
    }
    list.forEach((s, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", String(i));
      li.style.setProperty("--tilt", `${[-4, 2, -2, 3, -3][i % 5]}deg`);
      const a = document.createElement("a");
      a.className = "item";
      a.href = s.url;
      const patron = s.patron ?? "makoto";
      a.dataset.patron = patron;
      a.style.setProperty("--accent", site.sisters[patron].accent);
      a.innerHTML = `
        <span class="item__back" aria-hidden="true"></span>
        <span class="item__plain"></span>
        <span class="item__collage" aria-hidden="true"></span>
        <span class="item__status"><i></i></span>`;
      a.querySelector(".item__plain")!.textContent = s.name;
      a.querySelector(".item__collage")!.append(ransom(s.name.toUpperCase(), { palette: "red", seed: `item-${s.id}`, mixCase: true }));
      a.setAttribute("aria-label", s.subtitle ? `${s.name}, ${s.subtitle}` : s.name);
      a.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") select(i, false);
      });
      a.addEventListener("focus", () => select(i, false));
      a.addEventListener("click", (e) => {
        e.preventDefault();
        // Touch: first tap selects, second tap goes.
        if (index !== i) {
          select(i, false);
          return;
        }
        onGo(s);
      });
      li.append(a);
      ul.append(li);
      items.push(a);

      const status = a.querySelector<HTMLElement>(".item__status")!;
      if (site.statusChecks && s.status !== false) {
        states.set(s.id, "checking");
        status.dataset.state = "checking";
        check(s.url).then((ok) => {
          const st = ok ? "online" : "offline";
          states.set(s.id, st);
          status.dataset.state = st;
          refreshCount();
        });
      } else {
        states.set(s.id, "off");
        status.dataset.state = "off";
      }
    });
    refreshCount();
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
