// "Take your time" — the loading card between the site and wherever it's sending you.
// Shown on the very first paint (while the YAML and fonts arrive) and after the shard wipe
// when leaving for a subdomain. The figure in the corner is your own sprite strip or video;
// without one, a spinning thief-star stands in.

import type { LoaderConfig } from "./config";

export interface Loader {
  /** `instant` skips the wipe-in: on first paint the loader is simply already there. */
  show(instant?: boolean): Promise<void>;
  hide(): Promise<void>;
  /** Shows the loader, waits at least minDuration, then runs `go`. */
  through(go: () => void): Promise<void>;
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createLoader(cfg: LoaderConfig): Loader {
  const root = document.createElement("div");
  root.className = "nj-loader";
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <div class="nj-loader__bg" aria-hidden="true"><i class="nj-loader__band"></i><i class="nj-loader__band nj-loader__band--thin"></i></div>
    <div class="nj-loader__corner">
      <div class="nj-loader__figure" aria-hidden="true"></div>
      <div class="nj-loader__text"></div>
    </div>`;
  window.Niijima.ransom(root.querySelector<HTMLElement>(".nj-loader__text")!, cfg.text.toUpperCase(), {
    seed: "loader", tiles: ["paper", "ink", "red"], animate: false,
  });
  const figure = root.querySelector<HTMLElement>(".nj-loader__figure")!;
  figure.style.setProperty("--size", `${cfg.size}px`);
  mountFigure(figure, cfg);
  document.body.append(root);

  let visible = false;

  async function show(instant = false) {
    if (visible) return;
    visible = true;
    root.classList.remove("is-leaving");
    root.classList.toggle("is-instant", instant);
    root.classList.add("is-visible");
    await wait(instant || reduceMotion() ? 0 : 380);
  }
  async function hide() {
    if (!visible) return;
    root.classList.add("is-leaving");
    await wait(reduceMotion() ? 0 : 460);
    root.classList.remove("is-visible", "is-leaving", "is-instant");
    visible = false;
  }
  async function through(go: () => void) {
    await show();
    await wait(cfg.minDuration);
    go();
  }

  // Back button restores the page from the bfcache with the loader still up: drop it.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) { root.classList.remove("is-visible", "is-leaving"); visible = false; }
  });

  return { show, hide, through };
}

function mountFigure(el: HTMLElement, cfg: LoaderConfig) {
  const placeholder = () => {
    el.className = "nj-loader__figure nj-loader__figure--placeholder";
    el.style.backgroundImage = "";
    el.innerHTML = `<svg viewBox="0 0 100 100"><polygon points="50,3 61,37 97,37 68,59 79,95 50,73 21,95 32,59 3,37 39,37"/></svg>`;
  };
  // A GIF (or animated WebP/APNG) plays as-is. Also picked up when a .gif is given with type: sprite.
  if (cfg.src && (cfg.type === "image" || cfg.type === "gif" || /\.gif(\?|$)/i.test(cfg.src))) {
    const img = new Image();
    img.alt = "";
    img.decoding = "async";
    img.onerror = placeholder;
    img.src = cfg.src;
    el.classList.add("nj-loader__figure--image");
    el.append(img);
    return;
  }
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
      el.classList.add("nj-loader__figure--sprite");
      el.style.setProperty("--ratio", String(img.naturalWidth / frames / img.naturalHeight));
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
