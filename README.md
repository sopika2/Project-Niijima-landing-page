# Project: Niijima — landing page

The front door of **niijimasisters.com**. Persona 5 styled, built around Makoto and Sae Niijima.
The page is a locked, non-scrolling two-screen game menu on desktop and phone.

- **The split** — Makoto left, Sae right (top/bottom on phones), separated by a **torn-paper edge**
  that follows the guillotine cut: two ragged edges with white paper showing between them.
  Hovering slides the tear toward the other sister. `edge: clean` brings back the plain bolt.
- **The Network** — the pause-menu hub. Boiling red selection blade, ransom-note active item,
  a comic speech box with each entry's card and bust-up, the in-game **calendar with weather**,
  and an **ONLINE x/y** counter fed by Uptime Kuma or, without it, a ping of every live entry.
- **Shard wipes** between screens and **"Take your time"** before leaving for a subdomain (and on first paint).
- **404 Palace** — any unknown subdomain (Traefik's wildcard catch-all) or path: "This Palace doesn't exist".
- **Sounds** — your own files for hover / move / confirm / slash / back / error, with a Sound on/off toggle.
- **YAML config** read at runtime. Edit, reload, done.

## Controls

| | Desktop | Phone |
|---|---|---|
| Pick a sister | Hover / ← → , click or Enter | Tap |
| Open the Network | "The Network" button, or pick a sister | Tap |
| Move in the menu | ↑ ↓ , Enter | Tap |
| Back | Esc, or the BACK button | BACK / browser back |

The Network is `#network`, so browser back/forward and direct links work.

## Config — `public/config/` (no rebuild)

- **`site.yaml`** — domain, the two sisters (name, plates, tagline, render, status), torn/clean edge,
  loader, calendar (timezone + weather location), status checks (Kuma URL / ping), sounds.
- **`services.yaml`** — the Network menu, top to bottom. Add a subdomain there and reload.
  `status: online | soon | locked`; `soon` and `locked` entries show a stamp instead of navigating.

JSON works as well as YAML, so `servicesSource` can later point at an `/api/services` endpoint.
Keys from the first version of this repo (`name`, `subtitle`, `patron`, `ready`, `image.desktop`) are still understood.

### Online / offline

- **Uptime Kuma** (real up / down / pending / maintenance): set `status.kuma` to your status page's
  `/api/status-page/heartbeat/<slug>` and give entries a `monitorId`. Easiest same-origin via Traefik —
  see the commented block in `docker-compose.example.yml`. The badge says **LIVE**.
- **Ping fallback** (`status.ping: true`): every `online` entry without Kuma data gets a no-cors request.
  The browser can't read cross-origin status codes, so it only knows "answered" (ONLINE) vs.
  "network error / 5 s timeout" (DOWN). The badge says **PING**. With neither, it says **CONFIG**.

## Art and sounds — `public/assets/`

See [`public/assets/README.md`](public/assets/README.md). The folder is git-ignored apart from its README
and the favicon, so game art and sound rips stay on your server, not in the public repo.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # → dist/
```

Preview URLs: `/?view=network` (straight into the menu) · `/?preview=loader` (loader stays up) · `/?preview=404`.

## Deploy (Docker + nginx + Traefik)

`docker-compose.example.yml` has a ready service block. It

1. builds the image (Node build stage → nginx serving `dist/`),
2. mounts `public/config` and `public/assets` read-only, so config, art and sounds change without a rebuild,
3. routes `niijimasisters.com` and `www.` to the landing page,
4. adds a **priority-1 wildcard catch-all** (`HostRegexp(^.+\.niijimasisters\.com$)`), so any subdomain no
   other router claims gets the 404 Palace — every real service wins first,
5. optionally exposes Kuma's status JSON on the root domain for live statuses.

For the catch-all to get traffic, the Cloudflare tunnel needs a wildcard hostname
(`*.niijimasisters.com → http://localhost:80`) and a wildcard DNS record pointing at the tunnel.

nginx: `/config/` is never cached, `/assets/` for a day, hashed `/_app/` forever, everything else falls back to `index.html`.

## Layout

```
public/config/     site.yaml, services.yaml        ← edit these
public/assets/     your art + sfx/                  ← drop files here (git-ignored)
src/
  main.ts          boot: config → 404 or home, loader between leaving and arriving
  config.ts        YAML/JSON loading + defaults
  status.ts        Uptime Kuma polling + no-cors ping fallback
  loader.ts        "Take your time"
  notfound.ts      404 Palace
  site.css         page shell, loader, Palace
  fonts.ts         bundled fonts
  niijima/         the UI itself (split, torn edge, Network menu, HUD + weather, wipes, stamps, sounds)
                   — same code as the Niijima Network design system
```

## Fonts

Bundled (no Google Fonts request), all SIL Open Font License: Anton (display), Barlow Semi Condensed (body),
and the ransom-note faces Abril Fatface, Alfa Slab One, Archivo Black, Special Elite.

Fan site · Persona 5 © ATLUS / SEGA · not affiliated.
