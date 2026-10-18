// Ransom-note lettering: every letter gets its own font, colour block and tilt.
// Seeded by the text itself, so the same word always looks the same.

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

const VARIANTS = 6;

/**
 * @param palette "dark" = mostly black/white tiles, "red" = red tiles mixed in
 */
export function ransom(text: string, opts: { palette?: "dark" | "red"; seed?: string } = {}): HTMLElement {
  const rand = seeded(opts.seed ?? text);
  const wrap = document.createElement("span");
  wrap.className = `ransom ransom--${opts.palette ?? "dark"}`;
  wrap.setAttribute("aria-label", text);

  let prev = -1;
  // Letters are grouped per word so lines only break between words.
  let word: HTMLElement | null = null;
  for (const ch of text) {
    if (ch === " ") {
      word = null;
      continue;
    }
    if (!word) {
      word = document.createElement("span");
      word.className = "ransom__word";
      word.setAttribute("aria-hidden", "true");
      wrap.append(word);
    }
    const el = document.createElement("span");
    el.setAttribute("aria-hidden", "true");
    let v = Math.floor(rand() * VARIANTS);
    if (v === prev) v = (v + 1) % VARIANTS;
    prev = v;
    el.className = `ransom__ch ransom__ch--v${v}`;
    el.textContent = ch;
    el.style.setProperty("--rot", `${(rand() * 14 - 7).toFixed(1)}deg`);
    el.style.setProperty("--dy", `${(rand() * 0.16 - 0.08).toFixed(2)}em`);
    el.style.setProperty("--sz", `${(0.86 + rand() * 0.3).toFixed(2)}`);
    word.append(el);
  }
  return wrap;
}
