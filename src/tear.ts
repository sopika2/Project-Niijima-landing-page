// Torn-paper edge, drawn as CSS clip-path polygons.
// The jitter is generated once (seeded), so moving the tear only translates it —
// same point count every time, which lets the browser animate clip-path smoothly.

import { seeded } from "./ransom";

export type Orientation = "landscape" | "portrait";

export interface TearShape {
  steps: number;
  along: number[]; // position along the tear, 0–100
  edge: number[]; // offset of the front (coloured) edge, in %
  paper: number[]; // offset of the white paper edge behind it, in %
}

export function makeTear(seed = "niijima", steps = 46): TearShape {
  const r = seeded(seed);
  const along: number[] = [];
  const edge: number[] = [];
  const paper: number[] = [];
  let walk = 0;
  let walkP = 0;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 100;
    const nudge = i === 0 || i === steps ? 0 : (r() - 0.5) * (100 / steps) * 0.7;
    along.push(Math.max(0, Math.min(100, t + nudge)));
    walk = Math.max(-1.6, Math.min(1.6, walk + (r() - 0.5) * 0.9));
    walkP = Math.max(-0.8, Math.min(0.8, walkP + (r() - 0.5) * 0.6));
    const teeth = (i % 2 === 0 ? 1 : -1) * (0.15 + r() * 0.55);
    edge.push(walk + teeth);
    // Paper sits further toward Sae's side, with its own finer fibres.
    paper.push(walk + 1.1 + walkP + (r() - 0.5) * 0.9);
  }
  return { steps, along, edge, paper };
}

const f = (n: number) => `${n.toFixed(2)}%`;

/**
 * @param pos   where the tear crosses the middle of the screen (0–100)
 * @param tilt  how much the ends lean (± %)
 * @param layer "edge" for Makoto's panel, "paper" for the white strip
 */
export function clipFor(shape: TearShape, orient: Orientation, pos: number, tilt: number, layer: "edge" | "paper"): string {
  const offs = layer === "edge" ? shape.edge : shape.paper;
  const pts: string[] = [];
  if (orient === "landscape") {
    // Makoto owns everything left of the line; line runs top → bottom.
    pts.push("0% 0%");
    for (let i = 0; i <= shape.steps; i++) {
      const y = shape.along[i];
      const base = pos + tilt - (2 * tilt * y) / 100;
      pts.push(`${f(base + offs[i])} ${f(y)}`);
    }
    pts.push("0% 100%");
  } else {
    // Makoto owns the top; line runs right → left so the polygon closes cleanly.
    pts.push("0% 0%", "100% 0%");
    for (let i = shape.steps; i >= 0; i--) {
      const x = shape.along[i];
      const base = pos + tilt - (2 * tilt * x) / 100;
      pts.push(`${f(x)} ${f(base + offs[i] * 0.8)}`);
    }
  }
  return `polygon(${pts.join(", ")})`;
}
