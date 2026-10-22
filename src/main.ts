import "./fonts";
import "./niijima/niijima.css";
import "./niijima/niijima.js";
import "./site.css";
import { applyPersona, getPersona } from "@niijima/design";
import { loadServices, loadSite, toNiijima } from "./config";
import { createLoader } from "./loader";
import { createNotFound, type PalaceKind } from "./notfound";
import { createPersonaSwitch, pickPersona } from "./persona";
import { startStatus } from "./status";

async function boot() {
  const app = document.getElementById("app")!;
  const params = new URLSearchParams(location.search);
  const preview = params.get("preview");

  const site = await loadSite();
  document.title = site.title;
  applyPersona(getPersona());

  // The very first paint is the loader, already in place (no wipe-in, or the page being built
  // underneath shows through the part the wipe hasn't covered yet). The split reveals once fonts and config are in.
  const loader = createLoader(site.loader);
  const firstShow = loader.show(true);

  const host = location.hostname;
  const isSubdomain = host.endsWith(`.${site.domain}`) && host !== `www.${site.domain}`;
  const isUnknownPath = !["/", "/index.html"].includes(location.pathname);

  if (preview === "404" || preview === "soon" || preview === "down" || isSubdomain || isUnknownPath) {
    const rootUrl = host === site.domain || isSubdomain ? `https://${site.domain}/` : "/";
    // A host from the config isn't a missing Palace: it's either not open yet or not answering.
    let kind: PalaceKind = "missing";
    let name = "";
    if (isSubdomain || preview === "soon" || preview === "down") {
      const network = await loadServices(site.servicesSource, site.domain);
      const sisters = site.sisters.map((s) => ({ ...s, label: s.name.charAt(0) + s.name.slice(1).toLowerCase() }));
      const want = preview === "soon" ? "soon" : preview === "down" ? "online" : null;
      const known = [...sisters, ...network].find((e) => (want ? e.status === want : e.host === host));
      if (known) {
        name = known.label;
        kind = known.status === "soon" || known.status === "locked" ? "soon" : "down";
      }
    }
    app.className = "nj-page nj-page--palace";
    app.append(createNotFound(isSubdomain ? host : `${host}${location.pathname}`, rootUrl, kind, name));
    document.title = `${kind === "missing" ? "404" : kind === "soon" ? "Coming soon" : "Offline"} · ${site.title}`;
    await settle(firstShow);
    await loader.hide();
    return;
  }

  // ?view=hub / ?view=network opens straight on the menu.
  const view = params.get("view");
  if ((view === "hub" || view === "network") && location.hash !== "#network") history.replaceState(null, "", "#network");

  const network = await loadServices(site.servicesSource, site.domain);
  const cfg = toNiijima(site, network);
  const { calendar } = site;

  const home = window.Niijima.home(app, cfg, {
    edge: site.edge,
    timezone: calendar.timezone,
    weather: calendar.weather ? { latitude: calendar.latitude, longitude: calendar.longitude } : null,
    credit: site.credit,
    onSister: pickPersona,
    preferred: () => getPersona(),
    // Shards cover the screen → "Take your time" → the browser leaves.
    navigate(url, _item, wipe) {
      loader.through(() => {
        location.assign(url);
        setTimeout(() => wipe?.remove(), 400);
      });
    },
  });

  const names = Object.fromEntries(site.sisters.map((s) => [s.id, s.name])) as Record<string, string>;
  app
    .querySelector(".nj-home__net")
    ?.append(createPersonaSwitch({ makoto: names.makoto ?? "Makoto", sae: names.sae ?? "Sae" }));

  startStatus(site, network, home);

  await settle(firstShow);
  if (preview !== "loader") await loader.hide();
}

// Wait for the loader to be fully up, fonts to arrive (max 1.5 s), and a short beat.
async function settle(firstShow: Promise<void>) {
  await Promise.all([
    firstShow,
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]),
    new Promise((r) => setTimeout(r, 650)),
  ]);
}

boot();
