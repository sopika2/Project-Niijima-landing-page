// Shown for unknown subdomains (Traefik catch-all) and unknown paths.

import { ransom } from "./ransom";

export function createNotFound(target: string, rootUrl: string): HTMLElement {
  const el = document.createElement("section");
  el.className = "palace";
  el.innerHTML = `
    <div class="palace__bg" aria-hidden="true"><div class="palace__halftone"></div><div class="palace__slash"></div></div>
    <div class="palace__body">
      <div class="palace__code">404</div>
      <h1 class="palace__title"></h1>
      <div class="palace__target"><span>Target</span><code></code></div>
      <p class="palace__text">No distortion here. Nothing to steal. Whatever you were looking for never had a Palace.</p>
      <a class="palace__back" href="${rootUrl}">Return to the hideout</a>
    </div>`;
  el.querySelector(".palace__title")!.append(ransom("THIS PALACE DOESN'T EXIST", { palette: "dark", seed: "palace" }));
  el.querySelector(".palace__target code")!.textContent = target;
  return el;
}
