// Collage lettering: every letter is its own cut-out — mismatched font, tile and tilt —
// and each word is wrapped in a thick sticker outline. Seeded by the text, so the same
// word always comes out the same.

export function seeded(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VARIANTS = 7;

export interface RansomOptions {
  /** "dark" for red backgrounds (no red tiles), "red" allows red tiles. */
  palette?: "dark" | "red";
  seed?: string;
  /** Randomly drop some letters to lower case, menu-label style. */
  mixCase?: boolean;
  /** Make the first letter of each word noticeably bigger. Default true. */
  bigFirst?: boolean;
}

export function ransom(text: string, opts: RansomOptions = {}): HTMLElement {
  const rand = seeded(opts.seed ?? text);
  const bigFirst = opts.bigFirst ?? true;
  const wrap = document.createElement("span");
  wrap.className = `ransom ransom--${opts.palette ?? "dark"}`;
  wrap.setAttribute("aria-label", text);

  let prev = -1;
  let word: HTMLElement | null = null;
  let indexInWord = 0;

  for (const raw of text) {
    if (raw === " ") {
      word = null;
      continue;
    }
    if (!word) {
      word = document.createElement("span");
      word.className = "ransom__word";
      word.setAttribute("aria-hidden", "true");
      wrap.append(word);
      indexInWord = 0;
    }

    let ch = raw;
    if (opts.mixCase && indexInWord > 0 && /[a-z]/i.test(ch) && rand() < 0.4) ch = ch.toLowerCase();

    let v = Math.floor(rand() * VARIANTS);
    if (v === prev) v = (v + 1 + Math.floor(rand() * (VARIANTS - 1))) % VARIANTS;
    prev = v;

    const el = document.createElement("span");
    el.className = `ransom__ch ransom__ch--v${v}`;
    el.textContent = ch;

    const first = indexInWord === 0 && bigFirst;
    const size = first ? 1.28 + rand() * 0.14 : 0.82 + rand() * 0.32;
    el.style.setProperty("--sz", size.toFixed(2));
    el.style.setProperty("--rot", `${(rand() * 18 - 9).toFixed(1)}deg`);
    el.style.setProperty("--dy", `${(rand() * 0.2 - 0.1).toFixed(2)}em`);
    // Irregular cut: every tile is a slightly different quadrilateral.
    const j = () => (rand() * 9).toFixed(1);
    el.style.setProperty("--cut", `polygon(${j()}% ${j()}%, ${100 - +j()}% ${j()}%, ${100 - +j()}% ${100 - +j()}%, ${j()}% ${100 - +j()}%)`);
    el.style.zIndex = String(Math.floor(rand() * 4));

    word.append(el);
    indexInWord++;
  }
  return wrap;
}
