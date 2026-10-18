# Project: Niijima — landing page

The front door of **niijimasisters.com**. Persona 5 styled, built around Makoto and Sae Niijima.

- **Split screen** — Makoto and Sae, separated by a torn-paper edge. Hover/tap a side to focus it; click to go to her page.
- **Hub** — pause-menu list of every Niijima Network service, with the in-game style calendar and live online/offline status.
- **Loader** — "Take your time" screen between every transition, with your figure in the bottom-right corner.
- **404 Palace** — any unknown subdomain or path lands on "This Palace doesn't exist".

The page never scrolls, on desktop or phone.

## Controls

| | Desktop | Phone |
|---|---|---|
| Focus a sister | Hover, or ← → (A/D) | Tap once |
| Enter her page | Click, or Enter | Tap again / tap the button |
| Open the menu | Center emblem, Esc, or Tab | Tap the emblem |
| Move in menu | ↑ ↓ (W/S), Enter | Tap |
| Back | Esc | Back button |

In portrait the split is top/bottom, so it's ↑ ↓ instead of ← →.

## Config (no rebuild needed)

Both files live in `public/config/` and are loaded at runtime.

- **`site.yaml`** — sister names/codenames/arcana/colours, image paths and positioning, loader, calendar location, emblem.
- **`services.yaml`** — the hub menu. Add a subdomain there and reload.

Set `ready: true` on a sister once her subdomain exists; until then clicking her shows a "not yet" calling card.

## Art

See [`public/assets/README.md`](public/assets/README.md) for file names and sizes. Missing files show placeholders.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
```

Handy preview URLs:

- `/?view=hub` — open straight into the hub
- `/?preview=loader` — keep the loader on screen (for checking your sprite)
- `/?preview=404` — the 404 Palace

## Deploy (Traefik + Docker)

`docker-compose.example.yml` has a ready service block. It:

1. builds the image (nginx serving the built site),
2. mounts `public/config` and `public/assets` so you can change config and art without rebuilding,
3. routes `niijimasisters.com` and `www.` to the split screen,
4. adds a lowest-priority catch-all so unknown subdomains get the 404 Palace.

For the catch-all to receive traffic, the Cloudflare tunnel needs a wildcard hostname
(`*.niijimasisters.com → http://localhost:80`) and a wildcard DNS record pointing at the tunnel.

## Layout

```
public/config/   site.yaml, services.yaml   ← edit these
public/assets/   your art                    ← drop files here
src/
  main.ts        boot, routing, keyboard
  split.ts       split screen
  tear.ts        torn-paper edge geometry
  hub.ts         pause-menu hub + status checks
  calendar.ts    date / time of day / weather block
  loader.ts      "Take your time" screen
  notfound.ts    404 Palace
  notice.ts      calling-card notices
  ransom.ts      ransom-note lettering
  style.css      every visual lives here
```

## Later: automatic service discovery

The hub reads its list from `servicesSource` in `site.yaml`. It accepts YAML or JSON, so a small
`/api/services` endpoint that reads Traefik/Docker labels (e.g. `niijima.show=true`, `niijima.name=…`)
can replace `services.yaml` without touching the frontend.

## Fonts

Bundled with the app (no Google Fonts request): Anton, Archivo Black, Bebas Neue, Oswald,
Playfair Display, Rubik Mono One — all SIL Open Font License.
