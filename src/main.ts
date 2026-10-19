import "./fonts";
import "./niijima/niijima.css";
import "./niijima/niijima.js";
import "./site.css";
import { loadServices, loadSite, toNiijima } from "./config";
import { createLoader } from "./loader";
import { createNotFound } from "./notfound";
import { startStatus } from "./status";

async function boot() {
  const app = document.getElementById("app")!;
  const params = new URLSearchParams(location.search);
  const preview = params.get("preview");

  const site = await loadSite();
  document.title = site.title;

  // The very first paint is the loader; the split reveals once fonts and config are in.
  const loader = createLoader(site.loader);
  const firstShow = loader.show();

  const host = location.hostname;
  const isSubdomain = host.endsWith(`.${site.domain}`) && host !== `www.${site.domain}`;
  const isUnknownPath = !["/", "/index.html"].includes(location.pathname);

  if (preview === "404" || isSubdomain || isUnknownPath) {
    const rootUrl = host === site.domain || isSubdomain ? `https://${site.domain}/` : "/";
    app.className = "nj-page nj-page--palace";
    app.append(createNotFound(isSubdomain ? host : `${host}${location.pathname}`, rootUrl));
    document.title = `404 · ${site.title}`;
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
    // Shards cover the screen → "Take your time" → the browser leaves.
    navigate(url, _item, wipe) {
      loader.through(() => {
        location.assign(url);
        setTimeout(() => wipe?.remove(), 400);
      });
    },
  });

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
