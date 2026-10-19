// The 404 Palace: unknown subdomains (Traefik's wildcard catch-all lands here) and unknown paths.
// Two kinder variants share the layout: a host that's in the config but not open yet ("soon"),
// and an online one whose own router isn't answering, so the catch-all got it ("down").

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export type PalaceKind = "missing" | "soon" | "down";

const COPY: Record<PalaceKind, { code: string; title: (name: string) => string; speech: (name: string) => string }> = {
  missing: {
    code: "404",
    title: () => "THIS PALACE DOESN'T EXIST",
    speech: () => "No distortion here. Nothing to steal.<br>Whatever you were looking for never had a Palace.",
  },
  soon: {
    code: "SOON",
    title: (name) => `${name}'S PALACE ISN'T OPEN YET`,
    speech: (name) => `${esc(name)}'s corner of the Network is still being built.<br>The calling card goes out soon.`,
  },
  down: {
    code: "DOWN",
    title: (name) => `${name} IS SEALED OFF`,
    speech: (name) => `${esc(name)} isn't answering right now.<br>Lie low for a bit and try again.`,
  },
};

export function createNotFound(target: string, rootUrl: string, kind: PalaceKind = "missing", name = ""): HTMLElement {
  const N = window.Niijima;
  const copy = COPY[kind];
  const title = name ? copy.title(name.toUpperCase()) : COPY.missing.title("");
  const el = document.createElement("section");
  el.className = `nj nj-palace nj-palace--${kind}`;
  el.setAttribute("aria-labelledby", "nj-palace-title");
  el.innerHTML = `
    <div class="nj-palace__bg" aria-hidden="true">
      <i class="nj-palace__band"></i><i class="nj-palace__band nj-palace__band--thin"></i>
      <span class="nj-palace__ghost">${esc(copy.code)}</span>
    </div>
    <div class="nj-palace__body">
      <div class="nj-palace__code" aria-hidden="true"></div>
      <h1 class="nj-palace__title" id="nj-palace-title"></h1>
      <div class="nj-palace__target"><span>Target</span><code>${esc(target)}</code></div>
      <div class="nj-palace__speech">
        <p>${name ? copy.speech(name) : COPY.missing.speech("")}</p>
      </div>
      <div class="nj-palace__cta">${N.buttonHTML("Return to the hideout", { href: rootUrl })}</div>
    </div>
    <p class="nj-palace__credit">Fan site · Persona 5 © ATLUS / SEGA · not affiliated</p>`;
  N.ransom(el.querySelector<HTMLElement>(".nj-palace__code")!, copy.code, { seed: `palace-${copy.code}`, tiles: ["paper", "red", "ink"], tilt: 10 });
  N.ransom(el.querySelector<HTMLElement>(".nj-palace__title")!, title, { seed: "palace", tiles: ["paper", "ink", "red"] });
  el.querySelector("a")!.addEventListener("click", () => N.sfx.play("back"));
  return el;
}
