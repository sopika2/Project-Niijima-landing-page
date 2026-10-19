// Fonts are bundled (no Google Fonts request). Latin + latin-ext covers English and Hungarian.
import "@fontsource/anton/latin.css";
import "@fontsource/anton/latin-ext.css";
import "@fontsource/archivo-black/latin.css";
import "@fontsource/archivo-black/latin-ext.css";
import "@fontsource/bebas-neue/latin.css";
import "@fontsource/bebas-neue/latin-ext.css";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-700.css";
import "@fontsource/oswald/latin-ext-500.css";
import "@fontsource/oswald/latin-ext-700.css";
import "@fontsource/playfair-display/latin-900.css";
import "@fontsource/playfair-display/latin-ext-900.css";
import "@fontsource/rubik-mono-one/latin.css";
import "@fontsource/rubik-mono-one/latin-ext.css";
import "@fontsource/noto-sans/latin-500-italic.css";
import "@fontsource/noto-sans/latin-700-italic.css";
import "@fontsource/noto-sans/latin-ext-500-italic.css";
import "@fontsource/noto-sans/latin-ext-700-italic.css";
import "./style.css";
import { loadServices, loadSite, type Service, type Sister } from "./config";
import { createHub } from "./hub";
import { createLoader } from "./loader";
import { createNotFound } from "./notfound";
import { callingCard } from "./notice";
import { createSplit } from "./split";

async function boot() {
  const app = document.getElementById("app")!;
  const params = new URLSearchParams(location.search);
  const site = await loadSite();
  document.title = site.title;

  const loader = createLoader(site.loader);
  // The very first paint is the loader, so the split reveals with a wipe.
  const firstShow = loader.show();

  const host = location.hostname;
  const isSubdomain = host.endsWith(`.${site.domain}`) && host !== `www.${site.domain}`;
  const isUnknownPath = !["/", "/index.html"].includes(location.pathname);
  const preview = params.get("preview");

  if (preview === "404" || isSubdomain || isUnknownPath) {
    const rootUrl = host.endsWith(site.domain) ? `https://${site.domain}/` : "/";
    app.append(createNotFound(isSubdomain ? host : `${host}${location.pathname}`, rootUrl));
    document.title = `404 · ${site.title}`;
    await settle(firstShow);
    await loader.hide();
    return;
  }

  const enterSister = (s: Sister) => {
    if (!s.ready) {
      callingCard("NOT YET", `${s.name}'s page isn't open yet. Come back once it's ready.`, s.accent);
      return;
    }
    loader.through(() => location.assign(s.url));
  };
  const goService = (s: Service) => loader.through(() => location.assign(s.url));

  const hub = createHub(site, goService, () => closeHub());
  const split = createSplit(site, { onEnter: enterSister, onEmblem: () => openHub() });
  app.append(split.el, hub.el);

  function openHub() {
    hub.open();
    split.el.inert = true;
    app.dataset.view = "hub";
  }
  function closeHub() {
    hub.close();
    split.el.inert = false;
    app.dataset.view = "split";
  }

  loadServices(site.servicesSource).then(hub.setServices);

  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;

    if (e.key === "Escape") {
      e.preventDefault();
      hub.isOpen() ? closeHub() : openHub();
      return;
    }
    if (hub.isOpen()) {
      if (hub.key(e)) e.preventDefault();
      return;
    }
    // Tab opens the menu like the in-game pause button — but only when nothing has focus,
    // so normal keyboard navigation keeps working.
    if (e.key === "Tab" && (document.activeElement === document.body || !document.activeElement)) {
      e.preventDefault();
      openHub();
      return;
    }
    const portrait = split.el.dataset.orient === "portrait";
    const prev = portrait ? ["ArrowUp", "w"] : ["ArrowLeft", "a"];
    const next = portrait ? ["ArrowDown", "s"] : ["ArrowRight", "d"];
    if (prev.includes(e.key)) split.focus("makoto");
    else if (next.includes(e.key)) split.focus("sae");
    else if (e.key === "Enter" && split.focused() && document.activeElement === document.body) split.enterFocused();
    else return;
    e.preventDefault();
  });

  if (params.get("view") === "hub") openHub();
  else app.dataset.view = "split";

  await settle(firstShow);
  if (preview !== "loader") await loader.hide();
}

// Wait for the loader to be fully up, fonts to arrive (max 1.5s), and a short beat.
async function settle(firstShow: Promise<void>) {
  await Promise.all([
    firstShow,
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]),
    new Promise((r) => setTimeout(r, 650)),
  ]);
}

boot();
