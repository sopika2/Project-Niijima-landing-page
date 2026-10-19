# Art and sounds go here

Everything in this folder is yours and stays out of git (see `.gitignore`) — official game art and
sound rips shouldn't end up in a public repo. In Docker this folder is a volume, so drop files in and reload.
Paths are set in `config/site.yaml` and `config/services.yaml`; a missing file just shows the
labelled placeholder slot (or stays silent, for sounds).

## Images

Use WebP: the 768×768 portraits drop from ~300 KB as PNG to ~35 KB. If a `.webp` named in the config is missing,
the page quietly falls back to the `.png` with the same name. To convert: `cwebp -q 86 -m 6 makoto-landing.png -o makoto-landing.webp`.

| File | Where it shows | Notes |
|---|---|---|
| `og.jpg` | Link previews (Discord, X, iMessage…) | 1200×630. Named in `index.html`, so it has to keep this name. |
| `makoto-landing.webp` | Left half of the split (top on phones) | Transparent WebP (or PNG). Full-body cutouts: leave `renderFit` out. Square bust-ups (e.g. the 768×768 P5R portraits): `renderFit: cover`. Never upscaled, so use the biggest source you have. |
| `sae-landing.webp` | Right half (bottom on phones) | Same. |
| `menu-<id>.webp` | Next to the Network menu while that entry is selected | One per entry in `services.yaml` (`render:`). Loaded when the menu first opens. An entry without one shows its arcana numeral instead. |
| `loader.gif` | "Take your time" figure, bottom-right | A GIF or animated WebP with `type: image` in `site.yaml`; `size` sets its height. Or a sprite strip (`type: sprite`, `frames`, `fps`), or a `.webm` (`type: video`). |

The cutout gets the sister's hard comic outline + offset drop-shadows automatically
(Makoto: cyan / red, Sae: crimson / gold), so supply the art without any outline of its own.

## Sounds (`sfx/`)

`hover.wav` · `move.wav` · `confirm.wav` · `slash.wav` · `back.wav` · `error.wav` — wav, ogg or mp3.
Visitors get a Sound on/off toggle (remembered per browser). Browsers only allow audio after the
first click or key press, so the very first hover is silent — that's expected.
