// The hub: a pause-menu style list of every Niijima Network service.

import type { Service, SiteConfig } from "./config";
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

export function createHub(site: SiteConfig, onGo: (s: Service) => void, onClose: () => void): Hub {
  const el = document.createElement("section");
  el.className = "hub";
  el.setAttribute("aria-label", "Niijima Network menu");
  el.setAttribute("aria-hidden", "true");
  el.inert = true;
  el.innerHTML = `
    <div class="hub__bg" aria-hidden="true">
      <div class="hub__halftone"></div>
      <div class="hub__slab hub__slab--a"></div>
      <div class="hub__slab hub__slab--b"></div>
      <div class="hub__slab hub__slab--c"></div>
    </div>
    <div class="hub__top">
      <div class="hub__cal"></div>
      <button class="hub__close" type="button" aria-label="Back to the split screen"><span>Back</span></button>
    </div>
    <div class="hub__title"></div>
    <nav class="hub__menu" aria-label="Services"><ul></ul></nav>
    <div class="hub__keys" aria-hidden="true">
      <span><kbd>↑</kbd><kbd>↓</kbd> Select</span>
      <span><kbd>Enter</kbd> Go</span>
      <span><kbd>Esc</kbd> Back</span>
    </div>`;

  el.querySelector(".hub__cal")!.append(createCalendar(site.calendar));
  el.querySelector(".hub__title")!.append(ransom(site.title.toUpperCase(), { palette: "dark", seed: "hub-title" }));
  el.querySelector(".hub__close")!.addEventListener("click", () => onClose());

  const ul = el.querySelector("ul")!;
  let items: HTMLAnchorElement[] = [];
  let index = 0;
  let open = false;

  function select(i: number, focusIt = true) {
    if (!items.length) return;
    index = (i + items.length) % items.length;
    items.forEach((a, j) => a.classList.toggle("is-selected", j === index));
    if (focusIt) items[index].focus({ preventScroll: true });
  }

  function setServices(list: Service[]) {
    ul.replaceChildren();
    items = [];
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "hub__empty";
      li.textContent = "No services listed yet — add them in config/services.yaml";
      ul.append(li);
      return;
    }
    list.forEach((s, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", String(i));
      const a = document.createElement("a");
      a.className = "item";
      a.href = s.url;
      if (s.patron) {
        a.dataset.patron = s.patron;
        a.style.setProperty("--accent", site.sisters[s.patron]?.accent ?? "var(--red)");
      }
      a.innerHTML = `
        <span class="item__slab" aria-hidden="true"></span>
        <span class="item__text">
          <span class="item__name"></span>
          <span class="item__sub"></span>
        </span>
        <span class="item__status" data-state="${site.statusChecks && s.status !== false ? "checking" : "off"}"><i></i><b></b></span>`;
      a.querySelector(".item__name")!.textContent = s.name;
      a.querySelector(".item__sub")!.textContent = s.subtitle ?? new URL(s.url, location.href).host;
      a.addEventListener("pointerenter", () => select(i, false));
      a.addEventListener("focus", () => select(i, false));
      a.addEventListener("click", (e) => {
        e.preventDefault();
        onGo(s);
      });
      li.append(a);
      ul.append(li);
      items.push(a);
      if (site.statusChecks && s.status !== false) check(s.url, a.querySelector(".item__status")!);
    });
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
      setTimeout(() => select(index), 60);
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
      else if (e.key === "Enter" && items[index] && document.activeElement !== items[index]) items[index].click();
      else return false;
      return true;
    },
  };
}

// Best-effort reachability check. Cross-origin, so we can't read the status code —
// a resolved request means the host answered, a network error means it didn't.
async function check(url: string, el: HTMLElement) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    el.dataset.state = "online";
  } catch {
    el.dataset.state = "offline";
  } finally {
    clearTimeout(t);
  }
}
