import type { LeafType } from "./presets";
import type { Rng } from "./random";

const SVG_NS = "http://www.w3.org/2000/svg";

export type LeafDefinitionMap = Record<LeafType, string[]>;
export type LeafBaseAnchorMap = Record<LeafType, { x: number; y: number }>;

export const LEAF_BASE_ANCHORS: LeafBaseAnchorMap = {
  oval: { x: 0, y: 50 },
  lance: { x: 0, y: 62 },
  lobed: { x: 0, y: 56 },
  compound: { x: 0, y: 50 },
  needle: { x: 0, y: 62 },
  heart: { x: 0, y: 58 },
  fan: { x: 0, y: 58 },
  serrated: { x: 0, y: 60 },
  palmate: { x: 0, y: 52 },
  grassBlade: { x: 0, y: 68 },
  pod: { x: 0, y: 26 }
};

function createSvgElement<K extends keyof SVGElementTagNameMap>(documentRef: Document, tagName: K) {
  return documentRef.createElementNS(SVG_NS, tagName);
}

function createPath(documentRef: Document, id: string, d: string) {
  const path = createSvgElement(documentRef, "path");
  path.id = id;
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");
  return path;
}

function ovalPath(width: number, shoulder: number) {
  return `M 0 -50 C ${width} ${-38 - shoulder} ${width + 7} ${18 - shoulder} 0 50 C ${-width - 7} ${18 + shoulder} ${-width} ${-38 + shoulder} 0 -50 Z`;
}

function lancePath(width: number, bend: number) {
  return `M 0 -62 C ${width} -44 ${width + bend} 24 0 62 C ${-width + bend} 22 ${-width} -44 0 -62 Z`;
}

function lobedPath(rng: Rng) {
  const points: string[] = ["M 0 -56"];
  const steps = 7;
  for (let side = 1; side >= -1; side -= 2) {
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const y = -56 + t * 112;
      const base = Math.sin(t * Math.PI) * rng.float(24, 37);
      const notch = step % 2 === 0 ? rng.float(0.55, 0.72) : 1;
      const x = side * base * notch;
      points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  }
  points.push("Z");
  return points.join(" ");
}

function needlePath(width: number) {
  return `M 0 -68 L ${width} 62 L 0 54 L ${-width} 62 Z`;
}

function heartPath(width: number, cleft: number) {
  return `M 0 ${-46 + cleft} C ${width} -74 ${width + 28} -25 ${width * 0.62} 7 C ${width * 0.36} 31 10 47 0 58 C -10 47 ${-width * 0.36} 31 ${-width * 0.62} 7 C ${-width - 28} -25 ${-width} -74 0 ${-46 + cleft} Z`;
}

function fanPath(width: number, lift: number) {
  return `M 0 58 C ${-width - 14} ${24 + lift} ${-width - 4} ${-36 + lift} 0 -58 C ${width + 4} ${-36 - lift} ${width + 14} ${24 - lift} 0 58 Z`;
}

function serratedPath(rng: Rng) {
  const right: string[] = [];
  const left: string[] = [];
  const steps = 10;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const y = -60 + t * 120;
    const wave = step % 2 === 0 ? 0.72 : 1.08;
    const width = Math.sin(t * Math.PI) * rng.float(17, 27) * wave;
    right.push(`L ${width.toFixed(1)} ${y.toFixed(1)}`);
    left.unshift(`L ${(-width).toFixed(1)} ${y.toFixed(1)}`);
  }
  return ["M 0 -60", ...right, "L 0 60", ...left, "Z"].join(" ");
}

function palmatePath(rng: Rng) {
  const lobes = 7;
  const points: string[] = ["M 0 52"];
  for (let index = 0; index <= lobes; index += 1) {
    const angle = (-154 + (index / lobes) * 308) * Math.PI / 180;
    const radius = index % 2 === 0 ? rng.float(36, 48) : rng.float(58, 72);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius + 10;
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  points.push("Z");
  return points.join(" ");
}

function grassBladePath(width: number, bend: number) {
  return `M 0 68 C ${width + bend} 8 ${width * 0.65 + bend} -42 0 -72 C ${-width * 0.62 + bend} -34 ${-width + bend} 16 0 68 Z`;
}

function podPath(width: number, height: number) {
  return `M 0 ${-height} C ${width} ${-height * 0.62} ${width} ${height * 0.62} 0 ${height} C ${-width} ${height * 0.62} ${-width} ${-height * 0.62} 0 ${-height} Z`;
}

export function createLeafDefinitions(documentRef: Document, defs: SVGDefsElement, rng: Rng, prefix: string) {
  const leaves: LeafDefinitionMap = {
    oval: [],
    lance: [],
    lobed: [],
    compound: [],
    needle: [],
    heart: [],
    fan: [],
    serrated: [],
    palmate: [],
    grassBlade: [],
    pod: []
  };

  for (let index = 0; index < 5; index += 1) {
    const id = `${prefix}-oval-${index}`;
    leaves.oval.push(id);
    leaves.compound.push(id);
    defs.append(createPath(documentRef, id, ovalPath(rng.float(20, 32), rng.float(-5, 5))));
  }

  for (let index = 0; index < 5; index += 1) {
    const id = `${prefix}-lance-${index}`;
    leaves.lance.push(id);
    defs.append(createPath(documentRef, id, lancePath(rng.float(9, 18), rng.float(-5, 5))));
  }

  for (let index = 0; index < 5; index += 1) {
    const id = `${prefix}-lobed-${index}`;
    leaves.lobed.push(id);
    defs.append(createPath(documentRef, id, lobedPath(rng)));
  }

  for (let index = 0; index < 4; index += 1) {
    const id = `${prefix}-needle-${index}`;
    leaves.needle.push(id);
    defs.append(createPath(documentRef, id, needlePath(rng.float(3, 8))));
  }

  for (let index = 0; index < 4; index += 1) {
    const id = `${prefix}-heart-${index}`;
    leaves.heart.push(id);
    defs.append(createPath(documentRef, id, heartPath(rng.float(20, 31), rng.float(-4, 5))));
  }

  for (let index = 0; index < 4; index += 1) {
    const id = `${prefix}-fan-${index}`;
    leaves.fan.push(id);
    defs.append(createPath(documentRef, id, fanPath(rng.float(20, 34), rng.float(-6, 6))));
  }

  for (let index = 0; index < 5; index += 1) {
    const id = `${prefix}-serrated-${index}`;
    leaves.serrated.push(id);
    defs.append(createPath(documentRef, id, serratedPath(rng)));
  }

  for (let index = 0; index < 4; index += 1) {
    const id = `${prefix}-palmate-${index}`;
    leaves.palmate.push(id);
    defs.append(createPath(documentRef, id, palmatePath(rng)));
  }

  for (let index = 0; index < 4; index += 1) {
    const id = `${prefix}-grass-${index}`;
    leaves.grassBlade.push(id);
    defs.append(createPath(documentRef, id, grassBladePath(rng.float(4, 10), rng.float(-7, 7))));
  }

  for (let index = 0; index < 5; index += 1) {
    const id = `${prefix}-pod-${index}`;
    leaves.pod.push(id);
    defs.append(createPath(documentRef, id, podPath(rng.float(8, 15), rng.float(18, 31))));
  }

  return leaves;
}
