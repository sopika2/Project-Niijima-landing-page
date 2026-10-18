# Art goes here

Drop files in with these names (or change the paths in `config/site.yaml`).
Anything missing shows a labelled placeholder, so the page works before the art exists.

| File | What | Notes |
|---|---|---|
| `makoto.webp` | Makoto, desktop | Transparent background. ~1600×2400 or larger. Shown in the left half. |
| `sae.webp` | Sae, desktop | Same, right half. |
| `makoto-mobile.webp` | Makoto, phone | Optional. Wider crop (~1200×900) for the top half. Falls back to the desktop image. |
| `sae-mobile.webp` | Sae, phone | Optional. Same, bottom half. |
| `emblem.png` | Center emblem | Optional. Square, transparent. Sits inside the round badge on the tear. |
| `loader.png` | "Take your time" figure | Horizontal sprite strip, all frames the same size. Set `frames` and `fps` in `site.yaml`. Or use a video with `type: video`. |

Poses don't need to face each other — use `focusX`, `offsetX/Y` and `scale` per image in `site.yaml`
to place each sister inside her half.
