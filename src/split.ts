// The entry screen: Makoto and Sae, split by a torn-paper edge.

import type { SiteConfig, Sister, SisterId } from "./config";
import { ransom } from "./ransom";
import { clipFor, makeTear, type Orientation } from "./tear";

export interface SplitHandlers {
  onEnter(sister: Sister): void;
  onEmblem(): void;
}

export interface Split {
  el: HTMLElement;
  focus(id: SisterId | null): void;
  enterFocused(): void;
  focused(): SisterId | null;
}

const portraitQuery = matchMedia("(orientation: portrait), (max-aspect-ratio: 4/5)");

export function createSplit(site: SiteConfig, h: SplitHandlers): Split {
  const el = document.createElement("section");
  el.className = "split";
  el.setAttribute("aria-label", site.title);

  const sae = side(site.sisters.sae);
  const mk = side(site.sisters.makoto);

  const paperWrap = document.createElement("div");
  paperWrap.className = "split__paper-shadow";
  paperWrap.setAttribute("aria-hidden", "true");
  const paper = document.createElement("div");
  paper.className = "split__paper";
  paperWrap.append(paper);

  const emblem = document.createElement("button");
  emblem.className = "emblem";
  emblem.type = "button";
  emblem.setAttribute("aria-label", "Open the Niijima Network menu");
  emblem.innerHTML = `<span class="emblem__ring"></span><span class="emblem__inner"></span><span class="emblem__hint">Menu</span>`;
  const inner = emblem.querySelector<HTMLElement>(".emblem__inner")!;
  if (site.emblem) {
    const img = new Image();
    img.alt = "";
    img.onload = () => inner.replaceChildren(img);
    img.onerror = () => inner.replaceChildren(ransom("NS", { palette: "dark", seed: "emblem-ns" }));
    img.src = site.emblem;
  } else {
    inner.append(ransom("NS", { palette: "dark", seed: "emblem-ns" }));
  }
  emblem.addEventListener("click", (e) => {
    e.stopPropagation();
    h.onEmblem();
  });

  el.append(sae.root, paperWrap, mk.root, emblem);

  // ── Tear geometry ───────────────────────────────────────────
  const shape = makeTear("niijima-sisters");
  let orient: Orientation = portraitQuery.matches ? "portrait" : "landscape";
  let current: SisterId | null = null;

  const layout = () => {
    const pos = current === "makoto" ? 60 : current === "sae" ? 40 : 50;
    // Landscape leans "\" so Makoto's bottom-left and Sae's top-right corners get room for labels.
    const tilt = orient === "landscape" ? -6 : 3;
    mk.root.style.clipPath = clipFor(shape, orient, pos, tilt, "edge");
    paper.style.clipPath = clipFor(shape, orient, pos, tilt, "paper");
    el.dataset.orient = orient;
    el.style.setProperty("--tear", `${pos}%`);
    el.dataset.focus = current ?? "";
    mk.root.classList.toggle("is-focused", current === "makoto");
    sae.root.classList.toggle("is-focused", current === "sae");
    mk.root.classList.toggle("is-dimmed", current === "sae");
    sae.root.classList.toggle("is-dimmed", current === "makoto");
    mk.refreshArt(orient);
    sae.refreshArt(orient);
  };

  portraitQuery.addEventListener("change", () => {
    orient = portraitQuery.matches ? "portrait" : "landscape";
    layout();
  });

  // ── Interaction ─────────────────────────────────────────────
  // Mouse: hover focuses, click enters.
  // Touch: first tap focuses (and reveals the button), second tap enters.
  let lastPointer = "mouse";
  let lastTouch = 0;
  // Some phones/emulators fire a fake "mouse" hover right after a tap, once the tear
  // has moved under it — ignore mouse hovers shortly after any touch.
  const realMouse = (e: PointerEvent) => e.pointerType === "mouse" && performance.now() - lastTouch > 800;
  for (const s of [mk, sae]) {
    s.root.addEventListener("pointerdown", (e) => {
      lastPointer = e.pointerType;
      if (e.pointerType !== "mouse") lastTouch = performance.now();
    });
    s.root.addEventListener("pointerenter", (e) => {
      if (realMouse(e)) focus(s.sister.id);
    });
    s.root.addEventListener("click", () => {
      if (lastPointer !== "mouse" && current !== s.sister.id) {
        focus(s.sister.id);
        return;
      }
      h.onEnter(s.sister);
    });
    s.go.addEventListener("click", (e) => {
      e.stopPropagation();
      h.onEnter(s.sister);
    });
  }
  el.addEventListener("pointerleave", (e) => {
    if (realMouse(e)) focus(null);
  });

  function focus(id: SisterId | null) {
    if (current === id) return;
    current = id;
    layout();
  }

  layout();

  return {
    el,
    focus,
    focused: () => current,
    enterFocused: () => {
      if (current) h.onEnter(site.sisters[current]);
    },
  };
}

function side(s: Sister) {
  const root = document.createElement("div");
  root.className = `side side--${s.id}`;
  root.dataset.side = s.id;
  root.style.setProperty("--accent", s.accent);
  root.innerHTML = `
    <div class="side__bg" aria-hidden="true">
      <div class="side__halftone"></div>
      <div class="side__shards"></div>
    </div>
    <div class="side__art"><div class="side__frame"></div></div>
    <div class="side__label">
      <div class="side__tag"><span class="side__arcana"></span><span class="side__codename"></span></div>
      <h2 class="side__name"></h2>
      <div class="side__tagline"></div>
      <button class="side__go" type="button"></button>
    </div>`;
  root.querySelector(".side__arcana")!.textContent = s.arcana;
  root.querySelector(".side__codename")!.textContent = s.codename;
  root.querySelector(".side__name")!.append(ransom(s.name.toUpperCase(), { palette: s.id === "sae" ? "dark" : "red", seed: s.id }));
  root.querySelector(".side__tagline")!.textContent = s.tagline;
  const go = root.querySelector<HTMLButtonElement>(".side__go")!;
  go.textContent = s.ready ? `Enter ${s.name}'s page` : "Not open yet";
  go.setAttribute("aria-label", `${s.name} Niijima — ${s.ready ? "open page" : "not open yet"}`);

  const frame = root.querySelector<HTMLElement>(".side__frame")!;
  const im = s.image;
  frame.style.setProperty("--fx", `${im.focusX}%`);
  frame.style.setProperty("--fy", `${im.focusY}%`);
  frame.style.setProperty("--scale", String(im.scale));
  frame.style.setProperty("--ox", `${im.offsetX}%`);
  frame.style.setProperty("--oy", `${im.offsetY}%`);

  let shownFor: Orientation | null = null;

  // Tries the orientation-specific image, then the desktop one, then a labelled placeholder.
  function refreshArt(orient: Orientation) {
    if (shownFor === orient) return;
    shownFor = orient;
    const candidates = [orient === "portrait" ? im.mobile : undefined, im.desktop].filter(Boolean) as string[];
    const tryNext = (i: number) => {
      if (i >= candidates.length) {
        frame.classList.add("is-placeholder");
        frame.innerHTML = `<div class="placeholder"><span>${s.name} art slot</span><code>${
          orient === "portrait" ? im.mobile ?? im.desktop ?? "/assets/…" : im.desktop ?? "/assets/…"
        }</code></div>`;
        return;
      }
      const img = new Image();
      img.alt = `${s.name} Niijima`;
      img.decoding = "async";
      img.className = "cutout";
      img.onload = () => {
        if (shownFor !== orient) return;
        frame.classList.remove("is-placeholder");
        frame.replaceChildren(img);
      };
      img.onerror = () => tryNext(i + 1);
      img.src = candidates[i];
    };
    tryNext(0);
  }

  return { root, go, sister: s, refreshArt };
}
