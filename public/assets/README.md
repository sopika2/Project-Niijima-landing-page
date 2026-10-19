# Art and sounds go here

Everything in this folder is yours and stays out of git (see `.gitignore`) — official game art and
sound rips shouldn't end up in a public repo. In Docker this folder is a volume, so drop files in and reload.
Paths are set in `config/site.yaml` and `config/services.yaml`; a missing file just shows the
labelled placeholder slot (or stays silent, for sounds).

## Images

| File | Where it shows | Notes |
|---|---|---|
| `makoto-landing.png` | Left half of the split (top on phones) | Transparent PNG. Full-body cutouts: leave `renderFit` out. Square bust-ups (e.g. the 768×768 P5R portraits): `renderFit: cover`. Never upscaled, so use the biggest source you have. |
| `sae-landing.png` | Right half (bottom on phones) | Same. |
| `menu-<id>.png` | Next to the Network menu while that entry is selected | One per entry in `services.yaml` (`render:`). |
| `loader.gif` | "Take your time" figure, bottom-right | A GIF or animated WebP with `type: image` in `site.yaml`; `size` sets its height. Or a sprite strip (`type: sprite`, `frames`, `fps`), or a `.webm` (`type: video`). |

The cutout gets the sister's hard comic outline + offset drop-shadows automatically
(Makoto: cyan / red, Sae: crimson / gold), so supply the art without any outline of its own.

## Sounds (`sfx/`)

`hover.wav` · `move.wav` · `confirm.wav` · `slash.wav` · `back.wav` · `error.wav` — wav, ogg or mp3.
Visitors get a Sound on/off toggle (remembered per browser). Browsers only allow audio after the
first click or key press, so the very first hover is silent — that's expected.
