// The 404 Palace: unknown subdomains (Traefik's wildcard catch-all lands here) and unknown paths.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function createNotFound(target: string, rootUrl: string): HTMLElement {
  const N = window.Niijima;
  const el = document.createElement("section");
  el.className = "nj nj-palace";
  el.setAttribute("aria-labelledby", "nj-palace-title");
  el.innerHTML = `
    <div class="nj-palace__bg" aria-hidden="true">
      <i class="nj-palace__band"></i><i class="nj-palace__band nj-palace__band--thin"></i>
      <span class="nj-palace__ghost">404</span>
    </div>
    <div class="nj-palace__body">
      <div class="nj-palace__code" aria-hidden="true"></div>
      <h1 class="nj-palace__title" id="nj-palace-title"></h1>
      <div class="nj-palace__target"><span>Target</span><code>${esc(target)}</code></div>
      <div class="nj-palace__speech">
        <p>No distortion here. Nothing to steal.<br>Whatever you were looking for never had a Palace.</p>
      </div>
      <div class="nj-palace__cta">${N.buttonHTML("Return to the hideout", { href: rootUrl })}</div>
    </div>
    <p class="nj-palace__credit">Fan site · Persona 5 © ATLUS / SEGA · not affiliated</p>`;
  N.ransom(el.querySelector<HTMLElement>(".nj-palace__code")!, "404", { seed: "palace-404", tiles: ["paper", "red", "ink"], tilt: 10 });
  N.ransom(el.querySelector<HTMLElement>(".nj-palace__title")!, "THIS PALACE DOESN'T EXIST", { seed: "palace", tiles: ["paper", "ink", "red"] });
  el.querySelector("a")!.addEventListener("click", () => N.sfx.play("back"));
  return el;
}
