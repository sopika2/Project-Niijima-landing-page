// Small calling-card style notice, used for "not ready yet" and similar messages.

import { ransom } from "./ransom";

let current: HTMLElement | null = null;
let timer = 0;

export function callingCard(title: string, body: string, accent = "var(--red)") {
  current?.remove();
  clearTimeout(timer);

  const card = document.createElement("div");
  card.className = "card";
  card.setAttribute("role", "alert");
  card.style.setProperty("--accent", accent);
  card.innerHTML = `<div class="card__title"></div><p class="card__body"></p>`;
  card.querySelector(".card__title")!.append(ransom(title, { palette: "red", seed: title }));
  card.querySelector(".card__body")!.textContent = body;
  card.addEventListener("click", dismiss);
  document.body.append(card);
  current = card;
  requestAnimationFrame(() => card.classList.add("is-in"));
  timer = window.setTimeout(dismiss, 3200);

  function dismiss() {
    card.classList.remove("is-in");
    card.classList.add("is-out");
    setTimeout(() => card.remove(), 400);
    if (current === card) current = null;
  }
}
