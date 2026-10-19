# Design notes: how Persona 5 menus look and feel

Research behind the hub. Check new screens against this before building them.

## Layout
- Screen split by a white divide. One side red over the actual scene (tinted red), the other black/white with heavy pattern. The divide pulls the eye to the centre, where the important content sits. Used across many menus, not just one.
- The character stands across the divide and changes pose per selected item, which also signals a menu change.
- Menus sit near the action, not pinned to screen edges; info goes around the edges.

## Menu items
- Many items, small and tightly stacked, with an uneven left edge.
- Resting items: collage lettering in mostly black/white tiles, big size jumps between letters, first letter largest.
- Selected item: grows, picks up red, sits on a two-tone red/cyan highlight that re-shapes every ~120 ms.
- Description of the selected item appears in a clean italic sans, separate from the menu.

## Colour
- Red dominant, black and white secondary.
- Cyan and magenta only for highlights and stats (bars, avatars), never for surfaces.
- Info panels: black, white outline, angular cut corners.

## Type
- Collage lettering only for menu items, headers and names (repeated, memorable content).
- Clean sans for anything variable: descriptions, stats, instructions.

## Motion
- Slow heartbeat pulse on the selection.
- Wipes (horizontal, rotational) and white flash frames between states.
- Small screen shakes on impact, staggered entrances, text boxes that wobble.
- Snappy and stepped rather than smooth easing.

## Deliberately not used
The pause screen's own signature pieces: the giant hand, its star wallpaper, the header cards, the big word under the menu. The hub uses the conventions above without recreating that screen.

## Sources
- [Persona 5: Menus with Personality and Readability](https://medium.com/@fruitcupkun/persona-5-menus-with-personality-and-readability-d6db2e0b253e)
- [Interface so good that people make cosplay of it](https://medium.com/@kinga.olszewska/interface-so-good-that-people-make-cosplay-of-it-persona-5-ui-controversial-yet-brilliant-ac1ec4b95229)
- [What you can learn from Persona 5's UI design](https://ousiadroid.medium.com/what-you-can-learn-from-persona-5s-ui-design-4a4a646245b1)
- [Persona 5 — A masterclass in UI design](https://medium.com/@marktan_98815/persona-5-a-masterclass-in-ui-design-6e0470d2020f)
- [p5ui on Tumblr](https://www.tumblr.com/p5ui)
- [Persona 5 Menu UI (CodePen)](https://codepen.io/dangodev/pen/qXdxOO)
- [Visual Design of Games: Persona 5](https://mechanicsofmagic.com/2022/04/23/visual-design-of-games-persona-5/)
- [The Overwhelming Style of Persona 5's All-Out Attacks (transcript)](https://amara.org/videos/wIZbgZ3Jyy5D/en/3103539)
