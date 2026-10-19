// The hub: every Niijima Network service as a cascading menu on the left,
// the patron sister breaking out large on the right, changing pose per item.

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
  el.dataset.figure = site.hubFigure;
  el.setAttribute("aria-label", "Niijima Network menu");
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
  el.innerHTML = `
    <div class="hub__bg" aria-hidden="true">
      <div class="hub__stripes"></div>
      <div class="hub__slab"><div class="hub__halftone"></div></div>
      <div class="hub__band"></div>
      <div class="hub__shard hub__shard--a"></div>
      <div class="hub__shard hub__shard--b"></div>
      <div class="hub__flash"></div>
    </div>
    <div class="hub__figure" aria-hidden="true"><div class="hub__pose"></div></div>
    <div class="hub__cal"></div>
    <div class="hub__title" aria-hidden="true"></div>
    <button class="hub__close" type="button" aria-label="Back to the split screen"></button>
    <nav class="hub__menu" aria-label="Services"><ul></ul></nav>
    <div class="hub__bubble" aria-live="polite">
      <div class="bubble__name"></div>
      <p class="bubble__text"></p>
      <div class="bubble__host"></div>
    </div>
    <div class="hub__info" aria-hidden="true"><b class="info__count">–</b><span class="info__label">online</span></div>
    <div class="hub__keys" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd>Select</span>
      <span><kbd>Enter</kbd>Go</span>
      <span><kbd>Esc</kbd>Back</span>
    </div>`;

  el.querySelector(".hub__cal")!.append(createCalendar(site.calendar));
  el.querySelector(".hub__title")!.append(ransom(site.title.toUpperCase(), { palette: "red", seed: "hub-title" }));
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
  let shuffle = 0;
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
      pose.append(found.cloneNode() as HTMLImageElement);
      pose.classList.remove("is-placeholder");
    } else {
      pose.classList.add("is-placeholder");
      pose.innerHTML = `<div class="placeholder"><span>${art.name}: ${s.name} pose</span><code>${s.pose ?? art.image.desktop ?? "/assets/…"}</code></div>`;
    }
    el.dataset.patron = sister;
    if (!reduceMotion()) {
      // Hard cut in: overshoot sideways, flash white, settle.
      figure.animate(
        [
          { transform: "translateX(8%) skewX(-8deg)", filter: "brightness(4) contrast(2)" },
          { transform: "translateX(-1.5%) skewX(2deg)", filter: "none", offset: 0.45 },
          { transform: "translateX(0.5%)", offset: 0.75 },
          { transform: "none" },
        ],
        { duration: 240, easing: "steps(6, end)" },
      );
      flash.animate(
        [
          { transform: "translateX(-40%) skewX(-24deg)", opacity: 1 },
          { transform: "translateX(1400%) skewX(-24deg)", opacity: 1 },
        ],
        { duration: 220, easing: "cubic-bezier(0.7, 0, 0.3, 1)" },
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
          { transform: "scale(0.2) rotate(-20deg)", opacity: 0 },
          { transform: "scale(1.15) rotate(2deg)", opacity: 1, offset: 0.5 },
          { transform: "scale(0.96) rotate(-4deg)", offset: 0.75 },
          { transform: "rotate(-3deg)" },
        ],
        { duration: 260, easing: "steps(5, end)" },
      );
    }
  }

  function letter(a: HTMLAnchorElement, s: Service, seed: string) {
    a.querySelector(".item__collage")!.replaceChildren(ransom(s.name.toUpperCase(), { palette: "red", seed, mixCase: true }));
  }

  function select(i: number, focusIt = true) {
    if (!items.length) return;
    const next = (i + items.length) % items.length;
    if (focusIt) items[next].focus({ preventScroll: true });
    if (next === index) return;
    const prev = index;
    index = next;
    shuffle++;
    items.forEach((a, j) => a.classList.toggle("is-selected", j === index));
    // The old item goes back to its resting letters; the new one gets freshly cut ones.
    if (prev >= 0) letter(items[prev], services[prev], `item-${services[prev].id}`);
    letter(items[index], services[index], `item-${services[index].id}-${shuffle}`);
    const burst = items[index].querySelector<HTMLElement>(".item__burst")!;
    burst.classList.remove("is-firing");
    void burst.offsetWidth;
    burst.classList.add("is-firing");
    showPose(services[index]);
    updateBubble(services[index]);
  }

  function refreshCount() {
    const info = el.querySelector<HTMLElement>(".hub__info")!;
    const checked = [...states.values()].filter((v) => v !== "off");
    info.hidden = !checked.length;
    if (!checked.length) return;
    const online = checked.filter((v) => v === "online").length;
    const pending = checked.some((v) => v === "checking");
    count.textContent = pending ? "…" : `${online}/${checked.length}`;
    info.classList.toggle("is-bad", !pending && online < checked.length);
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
      li.style.setProperty("--tilt", `${[-5, 3, -3, 4, -2][i % 5]}deg`);
      const a = document.createElement("a");
      a.className = "item";
      a.href = s.url;
      a.setAttribute("aria-label", s.subtitle ? `${s.name}, ${s.subtitle}` : s.name);
      a.innerHTML = `
        <span class="item__burst" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <span class="item__back" aria-hidden="true"></span>
        <span class="item__collage" aria-hidden="true"></span>
        <span class="item__status"><i></i></span>`;
      letter(a, s, `item-${s.id}`);
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
