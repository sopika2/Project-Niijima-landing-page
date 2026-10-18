// "Take your time" loading screen.
// The figure in the bottom-right corner is whatever asset you drop in
// (sprite strip or video). Without one, a plain placeholder spinner is shown.

import type { LoaderConfig } from "./config";
import { ransom } from "./ransom";

export interface Loader {
  show(): Promise<void>;
  hide(): Promise<void>;
  /** Shows the loader, waits at least minDuration, then runs `go`. */
  through(go: () => void): Promise<void>;
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createLoader(cfg: LoaderConfig): Loader {
  const root = document.createElement("div");
  root.className = "loader";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div class="loader__wipe" aria-hidden="true"></div>
    <div class="loader__corner">
      <div class="loader__figure" aria-hidden="true"></div>
      <div class="loader__text"></div>
    </div>`;
  root.querySelector(".loader__text")!.append(ransom(cfg.text.toUpperCase(), { palette: "dark", seed: "loader" }));

  const figure = root.querySelector<HTMLElement>(".loader__figure")!;
  figure.style.setProperty("--size", `${cfg.size}px`);
  mountFigure(figure, cfg);

  document.body.append(root);

  let visible = false;

  async function show() {
    if (visible) return;
    visible = true;
    root.classList.remove("is-leaving");
    root.classList.add("is-visible");
    await wait(reduceMotion() ? 0 : 420);
  }

  async function hide() {
    if (!visible) return;
    root.classList.add("is-leaving");
    await wait(reduceMotion() ? 0 : 480);
    root.classList.remove("is-visible", "is-leaving");
    visible = false;
  }

  async function through(go: () => void) {
    await show();
    await wait(cfg.minDuration);
    go();
  }

  // Coming back with the browser's back button restores the page from cache
  // with the loader still up — drop it.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      root.classList.remove("is-visible", "is-leaving");
      visible = false;
    }
  });

  return { show, hide, through };
}

function mountFigure(el: HTMLElement, cfg: LoaderConfig) {
  const placeholder = () => {
    el.classList.add("loader__figure--placeholder");
    el.innerHTML = `<svg viewBox="0 0 100 100"><polygon points="50,4 61,38 97,38 68,59 79,94 50,72 21,94 32,59 3,38 39,38"/></svg>`;
  };

  if (cfg.type === "video" && cfg.src) {
    const v = document.createElement("video");
    Object.assign(v, { src: cfg.src, autoplay: true, loop: true, muted: true, playsInline: true });
    v.setAttribute("playsinline", "");
    v.onerror = placeholder;
    el.append(v);
    return;
  }

  if (cfg.type === "sprite" && cfg.src) {
    const img = new Image();
    img.onload = () => {
      const frames = Math.max(1, cfg.frames);
      const fw = img.naturalWidth / frames;
      const ratio = fw / img.naturalHeight;
      el.classList.add("loader__figure--sprite");
      el.style.setProperty("--ratio", String(ratio));
      el.style.setProperty("--frames", String(frames));
      el.style.setProperty("--dur", `${(frames / Math.max(1, cfg.fps)).toFixed(3)}s`);
      el.style.backgroundImage = `url("${cfg.src}")`;
    };
    img.onerror = placeholder;
    img.src = cfg.src;
    return;
  }

  placeholder();
}
