import type { CropRect, LayerConfig, LeafType, LightZone, PlantFamily, ScenePreset } from "./presets";
import { VIEWBOX } from "./presets";
import type { Rng } from "./random";

const OVERSCAN = 185;
const FRAME_MARGIN = 8;
const PROTECTED_ZONE_SAMPLE_STEPS = 72;
const VISIBLE_STEM_SAMPLE_STEPS = 96;
const FRAME_TOUCH_MARGIN = 18;
const MIN_CONNECTOR_LENGTH = 0.75;

export type Point = {
  x: number;
  y: number;
};

export type EdgeSide = "top" | "right" | "bottom" | "left";
export type OpeningMode = "quiet" | "soft" | "dense";
export type CurveProfile = "arc" | "sweep" | "sCurve" | "droop" | "upright";

export type StemSegment = {
  id: string;
  parentId: string | null;
  rootId: string;
  role: "main" | "branch" | "twig" | "blade";
  start: Point;
  c1: Point;
  c2: Point;
  end: Point;
  width: number;
  cap: "butt" | "square" | "round";
  curveProfile: CurveProfile;
};

export type AttachmentPoint = {
  id: string;
  stemId: string;
  rootId: string;
  t: number;
  point: Point;
  angle: number;
  normalAngle: number;
  width: number;
};

export type FoliageNode = {
  id: string;
  attachmentId: string;
  stemId: string;
  rootId: string;
  leafType: LeafType;
  point: Point;
  rotation: number;
  scaleX: number;
  scaleY: number;
  connectorStart: Point;
  side: -1 | 1;
};

export type PlantGraph = {
  id: string;
  organismId: string | null;
  family: PlantFamily;
  side: EdgeSide;
  root: Point;
  stems: StemSegment[];
  attachments: AttachmentPoint[];
  foliage: FoliageNode[];
  entryT: number;
  mainCurveProfile: CurveProfile;
};

export type GraphVisualMetrics = {
  rootVisibleInFullFrame: boolean;
  mainStemTouchesFrame: boolean;
  graphTouchesFrame: boolean;
  visibleParentLength: number;
};

export type ValidatedPlantGraph = PlantGraph & {
  validated: true;
  visual: GraphVisualMetrics;
};

export type PlantGraphAudit = {
  graphCount: number;
  densityTarget: number;
  stemCount: number;
  foliageCount: number;
  rootSides: Record<EdgeSide, number>;
  familyCounts: Record<PlantFamily, number>;
  orphanStems: number;
  orphanFoliage: number;
  estimatedSvgNodes: number;
  protectedZoneHits: number;
  longStrokeCrossings: number;
  rootVisibleInFullFrame: number;
  mainStemTouchesFrame: number;
  graphTouchesFrame: number;
  minVisibleParentLength: number;
  maxConnectorLength: number;
  leafAngleOutliers: number;
  maxLeafBaseAttachmentDistance: number;
  edgeCoverageMissingSides: number;
  edgeCoverageSkew: number;
  edgeSlotCount: number;
  treeGraphCount: number;
  curveProfileCounts: Record<CurveProfile, number>;
};

export type PlannedOrganism = {
  id: string;
  family: PlantFamily;
  side: EdgeSide;
  root: Point;
  layerKeys: readonly string[];
};

export type SceneOrganismPlan = {
  openingMode: OpeningMode;
  coverageSlots: readonly EdgeSide[];
  edgeTargets: Record<EdgeSide, number>;
  treeSilhouetteTarget: number;
  organisms: readonly PlannedOrganism[];
};

type FamilyProfile = {
  sideWeights: readonly { value: EdgeSide; weight: number }[];
  branchMultiplier: number;
  leafMultiplier: number;
  reachMultiplier: number;
  spreadMultiplier: number;
  stemMultiplier: number;
};

function lightDistance(point: Point, light: LightZone) {
  const dx = (point.x - light.x) / light.rx;
  const dy = (point.y - light.y) / light.ry;
  return Math.sqrt(dx * dx + dy * dy);
}

function protectedZoneFor(light: LightZone, openingMode: OpeningMode = "quiet"): LightZone {
  const rxScale = openingMode === "dense" ? 0.68 : openingMode === "soft" ? 0.82 : 0.94;
  const ryScale = openingMode === "dense" ? 0.66 : openingMode === "soft" ? 0.78 : 0.88;
  return {
    x: light.x,
    y: light.y,
    rx: light.rx * rxScale,
    ry: light.ry * ryScale
  };
}

function protectedZoneDistance(point: Point, light: LightZone, openingMode: OpeningMode = "quiet") {
  return lightDistance(point, protectedZoneFor(light, openingMode));
}

function openingModeForLayer(layer: LayerConfig, openingMode: OpeningMode) {
  if (layer.key === "near" || layer.key === "foreground") return "quiet";
  return openingMode;
}

function edgeDistance(point: Point) {
  return Math.min(point.x, VIEWBOX.width - point.x, point.y, VIEWBOX.height - point.y);
}

function familyProfile(family: PlantFamily): FamilyProfile {
  if (family === "tree") {
    return {
      sideWeights: [
        { value: "top", weight: 0.35 },
        { value: "right", weight: 1 },
        { value: "bottom", weight: 2.8 },
        { value: "left", weight: 1 }
      ],
      branchMultiplier: 1.45,
      leafMultiplier: 0.88,
      reachMultiplier: 1.12,
      spreadMultiplier: 0.78,
      stemMultiplier: 1.62
    };
  }

  if (family === "vine") {
    return {
      sideWeights: [
        { value: "top", weight: 2.7 },
        { value: "right", weight: 1.1 },
        { value: "bottom", weight: 0.28 },
        { value: "left", weight: 1.1 }
      ],
      branchMultiplier: 0.65,
      leafMultiplier: 0.92,
      reachMultiplier: 1.18,
      spreadMultiplier: 1.18,
      stemMultiplier: 0.82
    };
  }

  if (family === "fern") {
    return {
      sideWeights: [
        { value: "top", weight: 0.85 },
        { value: "right", weight: 1.05 },
        { value: "bottom", weight: 1.75 },
        { value: "left", weight: 1.05 }
      ],
      branchMultiplier: 0.35,
      leafMultiplier: 1.22,
      reachMultiplier: 0.94,
      spreadMultiplier: 0.92,
      stemMultiplier: 0.76
    };
  }

  if (family === "grass") {
    return {
      sideWeights: [
        { value: "top", weight: 0.18 },
        { value: "right", weight: 0.55 },
        { value: "bottom", weight: 3.4 },
        { value: "left", weight: 0.55 }
      ],
      branchMultiplier: 0.2,
      leafMultiplier: 1.05,
      reachMultiplier: 0.82,
      spreadMultiplier: 0.66,
      stemMultiplier: 0.58
    };
  }

  if (family === "podSpray") {
    return {
      sideWeights: [
        { value: "top", weight: 1 },
        { value: "right", weight: 1.1 },
        { value: "bottom", weight: 1.45 },
        { value: "left", weight: 1.1 }
      ],
      branchMultiplier: 1.18,
      leafMultiplier: 0.82,
      reachMultiplier: 0.92,
      spreadMultiplier: 0.92,
      stemMultiplier: 0.82
    };
  }

  return {
    sideWeights: [
      { value: "top", weight: 0.9 },
      { value: "right", weight: 1.1 },
      { value: "bottom", weight: 1.75 },
      { value: "left", weight: 1.1 }
    ],
    branchMultiplier: 1.12,
    leafMultiplier: 1.15,
    reachMultiplier: 0.98,
    spreadMultiplier: 1.08,
    stemMultiplier: 1
  };
}

function familiesForPreset(preset: ScenePreset): readonly { value: PlantFamily; weight: number }[] {
  if (preset.name === "flowing") {
    return [
      { value: "vine", weight: 3.2 },
      { value: "fern", weight: 2.4 },
      { value: "grass", weight: 1.5 },
      { value: "bush", weight: 0.8 },
      { value: "podSpray", weight: 0.7 }
    ];
  }

  if (preset.name === "dense") {
    return [
      { value: "tree", weight: 3.3 },
      { value: "bush", weight: 2.5 },
      { value: "grass", weight: 0.8 },
      { value: "podSpray", weight: 0.5 }
    ];
  }

  return [
    { value: "bush", weight: 2.6 },
    { value: "tree", weight: 1.8 },
    { value: "vine", weight: 1.5 },
    { value: "fern", weight: 1.1 },
    { value: "podSpray", weight: 0.7 },
    { value: "grass", weight: 0.5 }
  ];
}

function layerKeysForFamily(family: PlantFamily, preset: ScenePreset, rng: Rng) {
  if (family === "tree") return preset.name === "dense" ? ["middle", "near", "foreground"] : ["far", "middle", "near", "foreground"];
  if (family === "bush") return rng.chance(0.68) ? ["far", "middle", "near", "foreground"] : ["middle", "near", "foreground"];
  if (family === "vine") return rng.chance(0.72) ? ["mist", "far", "middle", "near"] : ["far", "middle", "near", "foreground"];
  if (family === "fern") return rng.chance(0.64) ? ["mist", "far", "middle", "near"] : ["far", "middle", "near"];
  if (family === "grass") return rng.chance(0.58) ? ["middle", "near", "foreground"] : ["near", "foreground"];
  return rng.chance(0.62) ? ["far", "middle", "near"] : ["mist", "far", "middle"];
}

function layerSupportsFamily(layer: LayerConfig, family: PlantFamily) {
  return layer.plantFamilies.some((item) => item.value === family);
}

function pointForSide(rng: Rng, side: EdgeSide, frameCrop: CropRect, targetCrop = frameCrop): Point {
  if (side === "top") {
    return { x: rng.float(targetCrop.x - OVERSCAN * 0.35, targetCrop.x + targetCrop.width + OVERSCAN * 0.35), y: frameCrop.y - rng.float(18, OVERSCAN) };
  }

  if (side === "right") {
    return { x: frameCrop.x + frameCrop.width + rng.float(18, OVERSCAN), y: rng.float(targetCrop.y - OVERSCAN * 0.35, targetCrop.y + targetCrop.height + OVERSCAN * 0.35) };
  }

  if (side === "bottom") {
    return { x: rng.float(targetCrop.x - OVERSCAN * 0.35, targetCrop.x + targetCrop.width + OVERSCAN * 0.35), y: frameCrop.y + frameCrop.height + rng.float(18, OVERSCAN) };
  }

  return { x: frameCrop.x - rng.float(18, OVERSCAN), y: rng.float(targetCrop.y - OVERSCAN * 0.35, targetCrop.y + targetCrop.height + OVERSCAN * 0.35) };
}

function chooseRoot(rng: Rng, layer: LayerConfig, light: LightZone, family: PlantFamily, frameCrop: CropRect, targetCrop: CropRect, forcedSide?: EdgeSide) {
  const profile = familyProfile(family);
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const side = forcedSide ?? rng.weighted(profile.sideWeights);
    const point = pointForSide(rng, side, frameCrop, targetCrop);
    const distance = lightDistance(point, light);
    const edgeScore = Math.max(0, 1 - edgeDistance(point) / 320);
    const keep = forcedSide || distance > rng.float(0.58, 1.02) || edgeScore > rng.float(0.08, 0.52 - layer.edgeBias * 0.18);
    if (keep) return { point, side };
  }

  const side = forcedSide ?? rng.weighted(profile.sideWeights);
  return { point: pointForSide(rng, side, frameCrop, targetCrop), side };
}

function inwardAngleForSide(side: EdgeSide, family: PlantFamily, rng: Rng) {
  if (family === "tree") {
    if (side === "bottom") return rng.float(-106, -74);
    if (side === "top") return rng.float(76, 104);
    if (side === "left") return rng.float(-24, 34);
    return rng.float(146, 204);
  }

  if (family === "grass") {
    if (side === "bottom") return rng.float(-108, -72);
    if (side === "top") return rng.float(72, 108);
    if (side === "left") return rng.float(-18, 34);
    return rng.float(146, 198);
  }

  if (side === "top") return family === "vine" ? rng.float(70, 110) : rng.float(50, 130);
  if (side === "bottom") return rng.float(-130, -50);
  if (side === "left") return family === "vine" ? rng.float(8, 62) : rng.float(-42, 46);
  return family === "vine" ? rng.float(118, 174) : rng.float(134, 222);
}

function layerStrokeScale(layer: LayerConfig) {
  if (layer.key === "mist") return 0.52;
  if (layer.key === "far") return 0.68;
  if (layer.key === "middle") return 0.9;
  if (layer.key === "near") return 1.12;
  return 1.34;
}

function minimumReach(layer: LayerConfig, forcedSide?: EdgeSide) {
  const base = layer.key === "mist" ? 175 : layer.key === "far" ? 215 : layer.key === "middle" ? 255 : layer.key === "near" ? 325 : 370;
  return forcedSide ? base + 45 : base;
}

function layerVisualWeight(layer: LayerConfig) {
  if (layer.key === "mist") return 0.35;
  if (layer.key === "far") return 0.5;
  if (layer.key === "middle") return 0.72;
  if (layer.key === "near") return 1;
  return 1.24;
}

function pointInsideCrop(point: Point, crop: CropRect) {
  return point.x >= crop.x && point.x <= crop.x + crop.width && point.y >= crop.y && point.y <= crop.y + crop.height;
}

function pointTouchesFrame(point: Point, crop: CropRect, margin = FRAME_TOUCH_MARGIN) {
  if (!pointInsideCrop(point, cropWithMargin(crop, margin))) return false;
  const distance = Math.min(
    Math.abs(point.x - crop.x),
    Math.abs(point.x - (crop.x + crop.width)),
    Math.abs(point.y - crop.y),
    Math.abs(point.y - (crop.y + crop.height))
  );
  return distance <= margin;
}

function cropWithMargin(crop: CropRect, margin: number): CropRect {
  return {
    x: crop.x - margin,
    y: crop.y - margin,
    width: crop.width + margin * 2,
    height: crop.height + margin * 2
  };
}

function cubicPoint(stem: StemSegment, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * stem.start.x + 3 * mt2 * t * stem.c1.x + 3 * mt * t2 * stem.c2.x + t2 * t * stem.end.x,
    y: mt2 * mt * stem.start.y + 3 * mt2 * t * stem.c1.y + 3 * mt * t2 * stem.c2.y + t2 * t * stem.end.y
  };
}

function cubicDerivative(stem: StemSegment, t: number): Point {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (stem.c1.x - stem.start.x) + 6 * mt * t * (stem.c2.x - stem.c1.x) + 3 * t * t * (stem.end.x - stem.c2.x),
    y: 3 * mt * mt * (stem.c1.y - stem.start.y) + 6 * mt * t * (stem.c2.y - stem.c1.y) + 3 * t * t * (stem.end.y - stem.c2.y)
  };
}

function angleAt(stem: StemSegment, t: number) {
  const derivative = cubicDerivative(stem, t);
  return Math.atan2(derivative.y, derivative.x) * 180 / Math.PI;
}

function stemPath(stem: StemSegment) {
  return `M ${stem.start.x.toFixed(1)} ${stem.start.y.toFixed(1)} C ${stem.c1.x.toFixed(1)} ${stem.c1.y.toFixed(1)} ${stem.c2.x.toFixed(1)} ${stem.c2.y.toFixed(1)} ${stem.end.x.toFixed(1)} ${stem.end.y.toFixed(1)}`;
}

function makeStem(
  id: string,
  parentId: string | null,
  rootId: string,
  role: StemSegment["role"],
  start: Point,
  angle: number,
  reach: number,
  curve: number,
  curveProfile: CurveProfile,
  width: number,
  cap: StemSegment["cap"],
  rng: Rng
): StemSegment {
  const rad = angle * Math.PI / 180;
  const normal = rad + Math.PI / 2;
  const profileCurve = Math.abs(curve) < 1 ? (rng.chance(0.5) ? -1 : 1) * Math.max(6, reach * 0.08) : curve;
  let bendOne = profileCurve * rng.float(0.18, 0.48);
  let bendTwo = profileCurve * rng.float(0.58, 1.08);
  let endBend = profileCurve * rng.float(0.32, 0.72);
  let endDrop = 0;

  if (curveProfile === "sweep") {
    bendOne = -profileCurve * rng.float(0.08, 0.28);
    bendTwo = profileCurve * rng.float(0.82, 1.22);
    endBend = profileCurve * rng.float(0.48, 0.86);
  } else if (curveProfile === "sCurve") {
    bendOne = -profileCurve * rng.float(0.55, 0.92);
    bendTwo = profileCurve * rng.float(0.7, 1.12);
    endBend = profileCurve * rng.float(0.1, 0.34);
  } else if (curveProfile === "droop") {
    bendOne = profileCurve * rng.float(0.12, 0.38);
    bendTwo = profileCurve * rng.float(0.5, 0.9);
    endBend = profileCurve * rng.float(0.32, 0.62);
    endDrop = reach * rng.float(0.06, 0.16);
  } else if (curveProfile === "upright") {
    bendOne = profileCurve * rng.float(0.04, 0.18);
    bendTwo = profileCurve * rng.float(0.18, 0.42);
    endBend = profileCurve * rng.float(0.08, 0.28);
  }

  const end = {
    x: start.x + Math.cos(rad) * reach + Math.cos(normal) * endBend,
    y: start.y + Math.sin(rad) * reach + Math.sin(normal) * endBend + endDrop
  };
  return {
    id,
    parentId,
    rootId,
    role,
    start,
    c1: {
      x: start.x + Math.cos(rad) * reach * 0.32 + Math.cos(normal) * bendOne,
      y: start.y + Math.sin(rad) * reach * 0.32 + Math.sin(normal) * bendOne
    },
    c2: {
      x: start.x + Math.cos(rad) * reach * 0.68 + Math.cos(normal) * bendTwo,
      y: start.y + Math.sin(rad) * reach * 0.68 + Math.sin(normal) * bendTwo
    },
    end,
    width,
    cap,
    curveProfile
  };
}

function firstEntryT(stem: StemSegment, crop: CropRect) {
  const visibleCrop = cropWithMargin(crop, FRAME_MARGIN);
  for (let step = 1; step <= 56; step += 1) {
    const t = step / 56;
    if (pointInsideCrop(cubicPoint(stem, t), visibleCrop)) return t;
  }
  return 1;
}

function stemReachesCrop(stem: StemSegment, crop: CropRect) {
  const visibleCrop = cropWithMargin(crop, FRAME_MARGIN);
  const inset = Math.min(42, Math.min(crop.width, crop.height) * 0.08);
  const deepCrop = cropWithMargin(crop, -inset);
  let visible = 0;
  let deep = 0;

  for (let step = 1; step <= 56; step += 1) {
    const point = cubicPoint(stem, step / 56);
    if (pointInsideCrop(point, visibleCrop)) visible += 1;
    if (pointInsideCrop(point, deepCrop)) deep += 1;
  }

  return visible >= 5 && deep >= 2;
}

function stemTouchesFrame(stem: StemSegment, crop: CropRect) {
  for (let step = 0; step <= VISIBLE_STEM_SAMPLE_STEPS; step += 1) {
    if (pointTouchesFrame(cubicPoint(stem, step / VISIBLE_STEM_SAMPLE_STEPS), crop)) return true;
  }
  return false;
}

function visibleStemLength(stem: StemSegment, crop: CropRect, endT = 1) {
  const visibleCrop = cropWithMargin(crop, FRAME_MARGIN);
  const steps = Math.max(8, Math.ceil(VISIBLE_STEM_SAMPLE_STEPS * endT));
  let length = 0;
  let previous = cubicPoint(stem, 0);

  for (let step = 1; step <= steps; step += 1) {
    const t = endT * (step / steps);
    const current = cubicPoint(stem, t);
    const midpoint = {
      x: (previous.x + current.x) / 2,
      y: (previous.y + current.y) / 2
    };
    if (pointInsideCrop(midpoint, visibleCrop)) length += Math.hypot(current.x - previous.x, current.y - previous.y);
    previous = current;
  }

  return length;
}

function closestTOnStem(point: Point, stem: StemSegment) {
  let closestT = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let step = 0; step <= VISIBLE_STEM_SAMPLE_STEPS; step += 1) {
    const t = step / VISIBLE_STEM_SAMPLE_STEPS;
    const sample = cubicPoint(stem, t);
    const distance = Math.hypot(point.x - sample.x, point.y - sample.y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestT = t;
    }
  }

  return closestT;
}

function pointTouchesStem(point: Point, stem: StemSegment) {
  for (let step = 0; step <= 42; step += 1) {
    const sample = cubicPoint(stem, step / 42);
    if (Math.hypot(point.x - sample.x, point.y - sample.y) <= Math.max(1.2, stem.width * 0.72)) return true;
  }
  return false;
}

function protectedStemCoverage(stem: StemSegment, light: LightZone, openingMode: OpeningMode = "quiet") {
  let hits = 0;
  for (let step = 0; step <= PROTECTED_ZONE_SAMPLE_STEPS; step += 1) {
    if (protectedZoneDistance(cubicPoint(stem, step / PROTECTED_ZONE_SAMPLE_STEPS), light, openingMode) < 1) hits += 1;
  }
  return hits / (PROTECTED_ZONE_SAMPLE_STEPS + 1);
}

function stemSamplesNearProtectedCenter(stem: StemSegment, light: LightZone, openingMode: OpeningMode = "quiet") {
  for (let step = 0; step <= PROTECTED_ZONE_SAMPLE_STEPS; step += 1) {
    if (protectedZoneDistance(cubicPoint(stem, step / PROTECTED_ZONE_SAMPLE_STEPS), light, openingMode) < 0.62) return true;
  }
  return false;
}

function maxProtectedStemCoverage(layer: LayerConfig, stem: StemSegment, openingMode: OpeningMode = "quiet") {
  const base = layer.key === "mist" ? 0.42 : layer.key === "far" ? 0.34 : layer.key === "middle" ? 0.2 : layer.key === "near" ? 0.1 : 0.06;
  const modeMultiplier = layer.key === "near" || layer.key === "foreground" ? 1 : openingMode === "dense" ? 1.55 : openingMode === "soft" ? 1.25 : 1;
  if ((layer.key === "near" || layer.key === "foreground") && stem.role === "blade") return base * 0.7;
  if (stem.role === "twig" || stem.role === "blade") return base * 1.35 * modeMultiplier;
  return base * modeMultiplier;
}

function stemIsLongProtectedCrossing(stem: StemSegment, light: LightZone, layer: LayerConfig, openingMode: OpeningMode = "quiet") {
  const effectiveMode = openingModeForLayer(layer, openingMode);
  const coverage = protectedStemCoverage(stem, light, effectiveMode);
  const visualWidth = stem.width * layerVisualWeight(layer);
  if (coverage > maxProtectedStemCoverage(layer, stem, effectiveMode) && visualWidth > 1.8) return true;
  if ((layer.key === "near" || layer.key === "foreground") && stem.role === "blade" && coverage > 0.035) return true;
  if ((layer.key === "near" || layer.key === "foreground") && stem.role !== "twig" && visualWidth > 4.2 && stemSamplesNearProtectedCenter(stem, light, effectiveMode)) return true;
  return false;
}

function pointAlongAngle(point: Point, angle: number, distance: number): Point {
  const rad = angle * Math.PI / 180;
  return {
    x: point.x + Math.cos(rad) * distance,
    y: point.y + Math.sin(rad) * distance
  };
}

function segmentProtectedCoverage(start: Point, end: Point, light: LightZone, openingMode: OpeningMode = "quiet") {
  let hits = 0;
  for (let step = 0; step <= 20; step += 1) {
    const t = step / 20;
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
    if (protectedZoneDistance(point, light, openingMode) < 1) hits += 1;
  }
  return hits / 21;
}

function foliageFootprintPoints(foliage: FoliageNode) {
  const growthAngle = foliage.rotation - 90;
  const longAxis = Math.max(28, Math.abs(foliage.scaleY) * 120);
  const shortAxis = Math.max(8, Math.abs(foliage.scaleX) * 42);
  const tip = pointAlongAngle(foliage.point, growthAngle, longAxis);
  const shoulder = pointAlongAngle(foliage.point, growthAngle, longAxis * 0.48);
  return [
    foliage.point,
    tip,
    pointAlongAngle(shoulder, growthAngle + 90, shortAxis),
    pointAlongAngle(shoulder, growthAngle - 90, shortAxis)
  ];
}

function foliageRiskInProtectedZone(foliage: FoliageNode, light: LightZone, layer: LayerConfig, openingMode: OpeningMode = "quiet") {
  const effectiveMode = openingModeForLayer(layer, openingMode);
  const distance = protectedZoneDistance(foliage.point, light, effectiveMode);
  const visualScale = Math.max(Math.abs(foliage.scaleX), Math.abs(foliage.scaleY)) * layerVisualWeight(layer);
  const footprintHit = foliageFootprintPoints(foliage).some((point) => protectedZoneDistance(point, light, effectiveMode) < 1);
  const connectorCoverage = segmentProtectedCoverage(foliage.connectorStart, foliage.point, light, effectiveMode);
  const connectorLength = Math.hypot(foliage.point.x - foliage.connectorStart.x, foliage.point.y - foliage.connectorStart.y);

  if (layer.key === "mist" || layer.key === "far") return (distance < 0.52 || connectorCoverage > 0.36) && visualScale > (openingMode === "quiet" ? 0.62 : 0.78);
  if (layer.key === "middle") return (distance < 0.74 || footprintHit || connectorCoverage > 0.22) && visualScale > (openingMode === "quiet" ? 0.78 : 0.94);
  return footprintHit || visualScale > 0.86 && distance < 1 || connectorCoverage > 0.12 && connectorLength > 12;
}

function minVisibleParentLength(layer: LayerConfig) {
  if (layer.key === "mist") return 12;
  if (layer.key === "far") return 18;
  if (layer.key === "middle") return 32;
  if (layer.key === "near") return 44;
  return 54;
}

function foliageVisibleInCrop(foliage: FoliageNode, crop: CropRect) {
  if (pointInsideCrop(foliage.point, cropWithMargin(crop, FRAME_MARGIN))) return true;
  return foliageFootprintPoints(foliage).some((point) => pointInsideCrop(point, cropWithMargin(crop, FRAME_MARGIN)));
}

function foliageConnectorLength(foliage: FoliageNode) {
  return Math.hypot(foliage.point.x - foliage.connectorStart.x, foliage.point.y - foliage.connectorStart.y);
}

function foliageAngleIsOutlier(foliage: FoliageNode) {
  const connectorLength = foliageConnectorLength(foliage);
  if (connectorLength < MIN_CONNECTOR_LENGTH * 1.5) return false;
  const connectorAngle = Math.atan2(foliage.point.y - foliage.connectorStart.y, foliage.point.x - foliage.connectorStart.x) * 180 / Math.PI;
  const leafAngle = foliage.rotation - 90;
  return angleDelta(connectorAngle, leafAngle) > 125;
}

function rootIsOffscreen(point: Point, crop: CropRect) {
  return point.x <= crop.x || point.x >= crop.x + crop.width || point.y <= crop.y || point.y >= crop.y + crop.height;
}

function createAttachment(id: string, stem: StemSegment, t: number): AttachmentPoint {
  const point = cubicPoint(stem, t);
  const angle = angleAt(stem, t);
  return {
    id,
    stemId: stem.id,
    rootId: stem.rootId,
    t,
    point,
    angle,
    normalAngle: angle + 90,
    width: stem.width
  };
}

function leafTypeForFamily(rng: Rng, layer: LayerConfig, family: PlantFamily): LeafType {
  if (family === "grass" && layer.leafTypes.includes("grassBlade")) return "grassBlade";
  if (family === "fern" && layer.leafTypes.includes("fan") && rng.chance(0.42)) return "fan";
  if (family === "vine" && layer.leafTypes.includes("lance") && rng.chance(0.58)) return "lance";
  if (family === "tree" && layer.leafTypes.includes("palmate") && rng.chance(0.32)) return "palmate";
  if (family === "tree" && layer.leafTypes.includes("lobed") && rng.chance(0.46)) return "lobed";
  if (family === "bush" && layer.leafTypes.includes("serrated") && rng.chance(0.34)) return "serrated";
  if (family === "podSpray") return layer.leafTypes.includes("pod") ? "pod" : "oval";
  return rng.pick(layer.leafTypes);
}

function attachmentTStart(entryT: number, family: PlantFamily) {
  if (family === "grass") return Math.min(0.86, entryT + 0.03);
  if (family === "tree") return Math.min(0.84, entryT + 0.08);
  return Math.min(0.84, entryT + 0.06);
}

function angleDelta(a: number, b: number) {
  return Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);
}

function vectorFromAngle(angle: number, weight: number) {
  const rad = angle * Math.PI / 180;
  return {
    x: Math.cos(rad) * weight,
    y: Math.sin(rad) * weight
  };
}

function angleFromVector(point: Point) {
  return Math.atan2(point.y, point.x) * 180 / Math.PI;
}

function profileCurveSign(side: EdgeSide, rng: Rng) {
  if (side === "left") return rng.chance(0.7) ? 1 : -1;
  if (side === "right") return rng.chance(0.7) ? -1 : 1;
  return rng.chance(0.5) ? -1 : 1;
}

function curveProfileFor(family: PlantFamily, layer: LayerConfig, side: EdgeSide, role: StemSegment["role"], rng: Rng): CurveProfile {
  if (role === "blade") return rng.chance(0.72) ? "upright" : "arc";
  if (family === "vine") return rng.weighted([
    { value: "sCurve", weight: 2.2 },
    { value: "droop", weight: side === "top" ? 2.4 : 0.8 },
    { value: "sweep", weight: 1.4 },
    { value: "arc", weight: 1 }
  ]);
  if (family === "tree") {
    if (role === "main") return side === "bottom" ? rng.weighted([
      { value: "upright", weight: 2.4 },
      { value: "sweep", weight: 1.6 },
      { value: "arc", weight: 1.2 }
    ]) : rng.weighted([
      { value: "sweep", weight: 2.2 },
      { value: "arc", weight: 1.5 },
      { value: "sCurve", weight: 0.7 }
    ]);
    return rng.weighted([
      { value: "sweep", weight: 2.4 },
      { value: "arc", weight: 1.7 },
      { value: "sCurve", weight: 1.1 },
      { value: "droop", weight: layer.key === "foreground" ? 0.8 : 0.4 }
    ]);
  }
  if (family === "fern") return rng.chance(0.75) ? "arc" : "sweep";
  if (family === "grass") return rng.chance(0.78) ? "upright" : "arc";
  return rng.weighted([
    { value: "arc", weight: 2 },
    { value: "sweep", weight: 1.8 },
    { value: "sCurve", weight: 0.9 },
    { value: "droop", weight: 0.6 }
  ]);
}

function leafDirectionAngle(attachment: AttachmentPoint, side: -1 | 1, family: PlantFamily, leafType: LeafType, rng: Rng) {
  const outwardAngle = attachment.angle + side * 90;
  const alongWeight = family === "grass" || leafType === "grassBlade" ? 0.9 : family === "vine" ? 0.68 : family === "podSpray" ? 0.55 : 0.42;
  const outwardWeight = family === "grass" || leafType === "grassBlade" ? 0.28 : family === "fern" ? 0.92 : family === "vine" ? 0.64 : 0.84;
  const along = vectorFromAngle(attachment.angle, alongWeight);
  const outward = vectorFromAngle(outwardAngle, outwardWeight);
  return angleFromVector({
    x: along.x + outward.x,
    y: along.y + outward.y
  }) + rng.float(-7, 7);
}

function connectorLengthForLeaf(family: PlantFamily, leafType: LeafType, layer: LayerConfig, scale: number, rng: Rng) {
  const nearLayer = layer.key === "near" || layer.key === "foreground";
  const sizeFactor = Math.max(0.72, Math.min(1.35, scale));
  if (family === "grass" || leafType === "grassBlade") return rng.float(MIN_CONNECTOR_LENGTH, nearLayer ? 2.8 : 5.2) * sizeFactor;
  if (family === "fern") return rng.float(2.5, nearLayer ? 8 : 12) * sizeFactor;
  if (family === "podSpray" || leafType === "pod") return rng.float(3, nearLayer ? 10 : 15) * sizeFactor;
  if (family === "vine") return rng.float(2, nearLayer ? 9 : 14) * sizeFactor;
  return rng.float(2.5, nearLayer ? 11 : 16) * sizeFactor;
}

function createFoliageFromAttachment(
  graphId: string,
  attachment: AttachmentPoint,
  leafType: LeafType,
  scale: number,
  side: -1 | 1,
  index: number,
  family: PlantFamily,
  layer: LayerConfig,
  rng: Rng
): FoliageNode {
  const normal = attachment.normalAngle * Math.PI / 180;
  const connectorLength = connectorLengthForLeaf(family, leafType, layer, scale, rng);
  const point = {
    x: attachment.point.x + Math.cos(normal) * connectorLength * side,
    y: attachment.point.y + Math.sin(normal) * connectorLength * side
  };
  const growthAngle = leafDirectionAngle(attachment, side, family, leafType, rng);
  const sizeX = scale * (leafType === "needle" ? rng.float(0.12, 0.26) : leafType === "grassBlade" ? rng.float(0.18, 0.36) : rng.float(0.2, 0.48));
  const sizeY = scale * (leafType === "needle" ? rng.float(0.34, 0.72) : leafType === "grassBlade" ? rng.float(0.64, 1.12) : rng.float(0.22, 0.54));

  return {
    id: `${graphId}-leaf-${index}`,
    attachmentId: attachment.id,
    stemId: attachment.stemId,
    rootId: attachment.rootId,
    leafType,
    point,
    rotation: growthAngle + 90,
    scaleX: sizeX,
    scaleY: sizeY,
    connectorStart: attachment.point,
    side
  };
}

function addSideBranches(graph: PlantGraph, mainStem: StemSegment, layer: LayerConfig, family: PlantFamily, entryT: number, rng: Rng) {
  const profile = familyProfile(family);
  const baseCount = Math.floor(layer.leafCount[1] * layer.branchiness * 0.13 * profile.branchMultiplier);
  const branchCount = Math.max(family === "tree" ? 2 : 0, Math.min(family === "grass" ? 2 : 7, baseCount + rng.int(-1, 2)));
  const minT = attachmentTStart(entryT, family);

  for (let index = 0; index < branchCount; index += 1) {
    const t = rng.float(minT, 0.92);
    const start = cubicPoint(mainStem, t);
    const parentAngle = angleAt(mainStem, t);
    const side = rng.chance(0.5) ? -1 : 1;
    const branchReach = rng.float(layer.spread[0] * 0.42, layer.spread[1] * 0.9) * profile.spreadMultiplier;
    const branchAngle = parentAngle + side * rng.float(28, family === "tree" ? 68 : 86);
    const branch = makeStem(
      `${graph.id}-stem-${graph.stems.length}`,
      mainStem.id,
      mainStem.rootId,
      family === "grass" ? "blade" : index % 3 === 0 ? "twig" : "branch",
      start,
      branchAngle,
      branchReach,
      rng.float(-layer.spread[0] * 0.18, layer.spread[1] * 0.28),
      curveProfileFor(family, layer, graph.side, index % 3 === 0 ? "twig" : "branch", rng),
      Math.max(0.42, mainStem.width * rng.float(0.22, 0.54)),
      "butt",
      rng
    );
    graph.stems.push(branch);
  }
}

function addTreeBranches(graph: PlantGraph, mainStem: StemSegment, layer: LayerConfig, entryT: number, rng: Rng) {
  const primaryCount = layer.key === "foreground" ? rng.int(2, 4) : rng.int(3, 4);
  const minT = Math.min(0.72, Math.max(entryT + 0.08, 0.2));

  for (let index = 0; index < primaryCount; index += 1) {
    const t = minT + (index / Math.max(1, primaryCount - 1)) * (0.86 - minT) + rng.float(-0.035, 0.035);
    const clampedT = Math.max(minT, Math.min(0.9, t));
    const start = cubicPoint(mainStem, clampedT);
    const parentAngle = angleAt(mainStem, clampedT);
    const side = index % 2 === 0 ? -1 : 1;
    const forkAngle = parentAngle + side * rng.float(34, 68);
    const reach = rng.float(layer.spread[0] * 0.78, layer.spread[1] * 1.28);
    const curve = profileCurveSign(graph.side, rng) * rng.float(layer.spread[0] * 0.18, layer.spread[1] * 0.42);
    const branch = makeStem(
      `${graph.id}-stem-${graph.stems.length}`,
      mainStem.id,
      mainStem.rootId,
      "branch",
      start,
      forkAngle,
      reach,
      curve,
      curveProfileFor("tree", layer, graph.side, "branch", rng),
      Math.max(0.7, mainStem.width * rng.float(0.34, 0.58)),
      "round",
      rng
    );
    graph.stems.push(branch);

    const twigCount = rng.int(1, layer.key === "foreground" ? 2 : 3);
    for (let twigIndex = 0; twigIndex < twigCount; twigIndex += 1) {
      const twigT = rng.float(0.38, 0.88);
      const twigStart = cubicPoint(branch, twigT);
      const branchAngle = angleAt(branch, twigT);
      const twigSide = twigIndex % 2 === 0 ? side : (side === 1 ? -1 : 1);
      const twig = makeStem(
        `${graph.id}-stem-${graph.stems.length}`,
        branch.id,
        mainStem.rootId,
        "twig",
        twigStart,
        branchAngle + twigSide * rng.float(24, 58),
        rng.float(layer.spread[0] * 0.28, layer.spread[1] * 0.58),
        profileCurveSign(graph.side, rng) * rng.float(layer.spread[0] * 0.08, layer.spread[1] * 0.24),
        curveProfileFor("tree", layer, graph.side, "twig", rng),
        Math.max(0.36, branch.width * rng.float(0.28, 0.52)),
        "round",
        rng
      );
      graph.stems.push(twig);
    }
  }
}

function attachmentStemsForFamily(graph: PlantGraph) {
  if (graph.family === "grass") return graph.stems;
  if (graph.family === "fern") return graph.stems.filter((stem) => stem.role === "main");
  if (graph.family === "tree") return graph.stems.filter((stem) => stem.role !== "main" || graph.stems.length < 3);
  return graph.stems;
}

function alternatingLeafSide(stemId: string, sideCounts: Map<string, number>, rng: Rng): -1 | 1 {
  const previousSide = sideCounts.get(stemId);
  if (!previousSide) {
    const side = rng.chance(0.5) ? -1 : 1;
    sideCounts.set(stemId, side);
    return side;
  }
  const side = previousSide === 1 ? -1 : 1;
  sideCounts.set(stemId, side);
  return side;
}

function addFoliage(graph: PlantGraph, layer: LayerConfig, family: PlantFamily, entryT: number, rng: Rng) {
  const profile = familyProfile(family);
  const targetLeaves = Math.max(3, Math.floor(rng.int(layer.leafCount[0], layer.leafCount[1]) * profile.leafMultiplier));
  const stems = attachmentStemsForFamily(graph);
  const leafType = leafTypeForFamily(rng, layer, family);
  const sideCounts = new Map<string, number>();
  let index = 0;

  if (family === "fern") {
    const stem = stems[0] ?? graph.stems[0];
    const pairs = Math.max(5, Math.floor(targetLeaves * 0.58));
    const startT = attachmentTStart(entryT, family);
    for (let pair = 0; pair < pairs; pair += 1) {
      const t = startT + (pair / Math.max(1, pairs - 1)) * (0.95 - startT);
      for (const side of [-1, 1] as const) {
        const attachment = createAttachment(`${graph.id}-attach-${graph.attachments.length}`, stem, t);
        graph.attachments.push(attachment);
        graph.foliage.push(createFoliageFromAttachment(graph.id, attachment, leafType, foliageScale(layer, family, rng) * (1 - t * 0.18), side, index, family, layer, rng));
        index += 1;
      }
    }
    return;
  }

  if (family === "grass") {
    graph.stems.forEach((stem, stemIndex) => {
      const attachment = createAttachment(`${graph.id}-attach-${graph.attachments.length}`, stem, rng.float(0.58, 0.96));
      graph.attachments.push(attachment);
      graph.foliage.push(createFoliageFromAttachment(graph.id, attachment, "grassBlade", foliageScale(layer, family, rng) * rng.float(0.62, 0.95), stemIndex % 2 === 0 ? -1 : 1, index, family, layer, rng));
      index += 1;
    });
    return;
  }

  while (index < targetLeaves) {
    const stem = rng.pick(stems);
    const minT = family === "tree" && stem.role !== "main" ? 0.46 : stem.role === "main" ? attachmentTStart(entryT, family) : 0.16;
    const maxT = family === "tree" && stem.role !== "main" ? 0.98 : stem.role === "twig" ? 0.94 : 0.9;
    const t = rng.float(minT, maxT);
    const attachment = createAttachment(`${graph.id}-attach-${graph.attachments.length}`, stem, t);
    const side = alternatingLeafSide(stem.id, sideCounts, rng);
    graph.attachments.push(attachment);
    graph.foliage.push(createFoliageFromAttachment(graph.id, attachment, family === "podSpray" && rng.chance(0.72) ? "pod" : leafType, foliageScale(layer, family, rng), side, index, family, layer, rng));
    index += 1;
  }
}

function foliageScale(layer: LayerConfig, family: PlantFamily, rng: Rng) {
  const scale = rng.float(layer.leafScale[0], layer.leafScale[1]);
  const densityScale = layer.key === "foreground" ? 0.82 : layer.key === "near" ? 0.86 : layer.key === "middle" ? 0.9 : layer.key === "far" ? 0.92 : 0.95;
  if (family === "grass" && (layer.key === "near" || layer.key === "foreground")) return scale * 0.56 * densityScale;
  if (family === "grass" && layer.key === "middle") return scale * 0.72 * densityScale;
  return scale * densityScale;
}

function addGrassBlades(graph: PlantGraph, mainStem: StemSegment, layer: LayerConfig, entryT: number, rng: Rng) {
  const count = Math.min(8, Math.max(3, Math.floor(layer.leafCount[1] * 0.42)));
  for (let index = 0; index < count; index += 1) {
    const t = rng.float(Math.max(0.08, entryT - 0.02), Math.min(0.8, entryT + 0.22));
    const start = cubicPoint(mainStem, t);
    const baseAngle = angleAt(mainStem, t);
    const side = index % 2 === 0 ? -1 : 1;
    const blade = makeStem(
      `${graph.id}-stem-${graph.stems.length}`,
      mainStem.id,
      mainStem.rootId,
      "blade",
      start,
      baseAngle + side * rng.float(14, 42),
      rng.float(layer.reach[0] * 0.28, layer.reach[1] * 0.52),
      rng.float(-layer.spread[0] * 0.18, layer.spread[1] * 0.18),
      curveProfileFor("grass", layer, graph.side, "blade", rng),
      Math.max(0.34, mainStem.width * rng.float(0.16, 0.34)),
      "butt",
      rng
    );
    graph.stems.push(blade);
  }
}

function validateGraph(graph: PlantGraph, crop: CropRect, light: LightZone, layer: LayerConfig, openingMode: OpeningMode = "quiet"): ValidatedPlantGraph | null {
  if (!rootIsOffscreen(graph.root, crop)) return null;
  const mainStem = graph.stems.find((stem) => stem.parentId === null);
  if (!mainStem || !stemReachesCrop(mainStem, crop) || !stemTouchesFrame(mainStem, crop)) return null;

  const stems = new Map(graph.stems.map((stem) => [stem.id, stem]));
  const attachments = new Map(graph.attachments.map((attachment) => [attachment.id, attachment]));
  const minimumParentLength = minVisibleParentLength(layer);
  let shortestVisibleParentLength = Number.POSITIVE_INFINITY;
  let graphTouchesFrame = stemTouchesFrame(mainStem, crop);

  for (const stem of graph.stems) {
    if (stem.parentId && !stems.has(stem.parentId)) return null;
    if (stem.parentId) {
      const parent = stems.get(stem.parentId);
      if (!parent) return null;
      if (!pointTouchesStem(stem.start, parent)) return null;
      if (stemReachesCrop(stem, crop)) {
        const parentT = closestTOnStem(stem.start, parent);
        const parentLength = visibleStemLength(parent, crop, parentT);
        shortestVisibleParentLength = Math.min(shortestVisibleParentLength, parentLength);
        if (parentLength < minimumParentLength) return null;
      }
    }
    if (stemTouchesFrame(stem, crop)) graphTouchesFrame = true;
    if (stemIsLongProtectedCrossing(stem, light, layer, openingMode)) return null;
  }

  for (const attachment of graph.attachments) {
    if (!stems.has(attachment.stemId)) return null;
  }

  for (const foliage of graph.foliage) {
    const attachment = attachments.get(foliage.attachmentId);
    if (!attachment) return null;
    if (attachment.stemId !== foliage.stemId || attachment.rootId !== foliage.rootId) return null;
    if (foliageRiskInProtectedZone(foliage, light, layer, openingMode)) return null;
    if (foliageVisibleInCrop(foliage, crop)) {
      const parent = stems.get(foliage.stemId);
      if (!parent) return null;
      const parentLength = visibleStemLength(parent, crop, attachment.t);
      shortestVisibleParentLength = Math.min(shortestVisibleParentLength, parentLength);
      if (parentLength < minimumParentLength) return null;
    }
  }

  const visual: GraphVisualMetrics = {
    rootVisibleInFullFrame: pointInsideCrop(graph.root, crop),
    mainStemTouchesFrame: stemTouchesFrame(mainStem, crop),
    graphTouchesFrame,
    visibleParentLength: Number.isFinite(shortestVisibleParentLength) ? shortestVisibleParentLength : visibleStemLength(mainStem, crop)
  };

  if (visual.rootVisibleInFullFrame || !visual.mainStemTouchesFrame) return null;
  if (!visual.graphTouchesFrame && layer.key !== "mist" && layer.key !== "far") return null;

  return { ...graph, validated: true, visual };
}

function createPlantGraph(
  id: string,
  rng: Rng,
  layer: LayerConfig,
  light: LightZone,
  crop: CropRect,
  targetCrop: CropRect,
  forcedSide?: EdgeSide,
  plannedOrganism?: PlannedOrganism,
  openingMode: OpeningMode = "quiet"
): ValidatedPlantGraph | null {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const family = plannedOrganism?.family ?? rng.weighted(layer.plantFamilies);
    const profile = familyProfile(family);
    const root = plannedOrganism ? { point: plannedOrganism.root, side: plannedOrganism.side } : chooseRoot(rng, layer, light, family, crop, targetCrop, forcedSide);
    const angle = inwardAngleForSide(root.side, family, rng);
    const reach = Math.max(rng.float(layer.reach[0], layer.reach[1]), rng.float(minimumReach(layer, forcedSide), minimumReach(layer, forcedSide) + 100)) * profile.reachMultiplier;
    const spread = rng.float(layer.spread[0], layer.spread[1]) * profile.spreadMultiplier;
    const width = rng.float(layer.branchWidth[0], layer.branchWidth[1]) * layerStrokeScale(layer) * profile.stemMultiplier * 0.9;
    const mainCurveProfile = curveProfileFor(family, layer, root.side, "main", rng);
    const graph: PlantGraph = {
      id,
      organismId: plannedOrganism?.id ?? null,
      family,
      side: root.side,
      root: root.point,
      stems: [],
      attachments: [],
      foliage: [],
      entryT: 1,
      mainCurveProfile
    };
    const mainCurve = profileCurveSign(root.side, rng) * spread * rng.float(0.45, family === "tree" ? 1.05 : 0.9);
    const mainStem = makeStem(`${id}-stem-0`, null, `${id}-stem-0`, "main", root.point, angle, reach, mainCurve, mainCurveProfile, width, family === "tree" ? "round" : "butt", rng);
    if (!stemReachesCrop(mainStem, crop)) continue;
    graph.entryT = firstEntryT(mainStem, crop);
    if (graph.entryT > 0.78) continue;
    graph.stems.push(mainStem);

    if (family === "grass") addGrassBlades(graph, mainStem, layer, graph.entryT, rng);
    else if (family === "tree" && (layer.key === "middle" || layer.key === "near" || layer.key === "foreground")) addTreeBranches(graph, mainStem, layer, graph.entryT, rng);
    else addSideBranches(graph, mainStem, layer, family, graph.entryT, rng);

    addFoliage(graph, layer, family, graph.entryT, rng);
    const validated = validateGraph(graph, crop, light, layer, openingMode);
    if (validated) return validated;
  }

  return null;
}

export function pathForStem(stem: StemSegment) {
  return stemPath(stem);
}

export function connectorSegment(start: Point, end: Point) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function forcedSidesForLayer(layer: LayerConfig): EdgeSide[] {
  if (layer.key === "foreground") return ["top", "bottom"];
  if (layer.key === "near") return ["left", "right", "bottom"];
  if (layer.key === "middle") return ["top", "bottom"];
  return [];
}

function graphTotalForLayer(layer: LayerConfig, forcedSides: EdgeSide[], rng: Rng) {
  const sampledTotal = rng.int(layer.clusterCount[0], layer.clusterCount[1]);
  if (layer.key === "mist") return sampledTotal + 4;
  if (layer.key === "far") return sampledTotal + 8;
  const cappedTotal = layer.key === "foreground" ? Math.min(sampledTotal, 4) : layer.key === "near" ? Math.min(sampledTotal, 6) : layer.key === "middle" ? Math.min(sampledTotal, 6) : sampledTotal;
  return Math.max(forcedSides.length, cappedTotal);
}

function targetPlannedGraphCount(layer: LayerConfig, graphTotal: number) {
  if (layer.key === "foreground") return Math.min(4, graphTotal);
  if (layer.key === "near") return Math.min(6, graphTotal);
  if (layer.key === "middle") return Math.min(6, graphTotal);
  return graphTotal;
}

export function densityTargetForLayer(layer: LayerConfig) {
  if (layer.key === "mist") return layer.clusterCount[1] + 4;
  if (layer.key === "far") return layer.clusterCount[1] + 8;
  if (layer.key === "middle") return 6;
  if (layer.key === "near") return 6;
  if (layer.key === "foreground") return 4;
  return layer.clusterCount[1];
}

function centeredCoverCrop(crop: CropRect): CropRect {
  const width = Math.min(crop.width, Math.max(520, crop.height * 0.72));
  return {
    x: crop.x + (crop.width - width) / 2,
    y: crop.y,
    width,
    height: crop.height
  };
}

function requiredOrganismCount(preset: ScenePreset, rng: Rng) {
  if (preset.name === "dense") return rng.int(9, 11);
  return rng.int(8, 10);
}

function chooseOpeningMode(rng: Rng): OpeningMode {
  return rng.weighted([
    { value: "quiet", weight: 70 },
    { value: "soft", weight: 25 },
    { value: "dense", weight: 5 }
  ]);
}

function emptyEdgeTargets(): Record<EdgeSide, number> {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

function sideWeightsForCoverage(preset: ScenePreset) {
  if (preset.name === "flowing") return [
    { value: "top" as const, weight: 1.45 },
    { value: "right" as const, weight: 1.05 },
    { value: "bottom" as const, weight: 0.85 },
    { value: "left" as const, weight: 1.05 }
  ];
  if (preset.name === "dense") return [
    { value: "top" as const, weight: 0.9 },
    { value: "right" as const, weight: 1.1 },
    { value: "bottom" as const, weight: 1.55 },
    { value: "left" as const, weight: 1.1 }
  ];
  return [
    { value: "top" as const, weight: 1 },
    { value: "right" as const, weight: 1.12 },
    { value: "bottom" as const, weight: 1.35 },
    { value: "left" as const, weight: 1.12 }
  ];
}

function fallbackCoverageWeights(): readonly { value: EdgeSide; weight: number }[] {
  return [
    { value: "top", weight: 1 },
    { value: "right", weight: 1.12 },
    { value: "bottom", weight: 1.35 },
    { value: "left", weight: 1.12 }
  ];
}

function createCoverageSlots(preset: ScenePreset, count: number, rng: Rng) {
  const slots: EdgeSide[] = [];
  const targets = emptyEdgeTargets();
  const required: EdgeSide[] = ["top", "right", "bottom", "left"];

  while (slots.length < Math.min(count, required.length)) {
    const side = required[slots.length];
    slots.push(side);
    targets[side] += 1;
  }

  while (slots.length < count) {
    const leastTarget = Math.min(targets.top, targets.right, targets.bottom, targets.left);
    const candidates = sideWeightsForCoverage(preset).filter((item) => targets[item.value] <= leastTarget + 1);
    const side = rng.weighted(candidates.length > 0 ? candidates : sideWeightsForCoverage(preset));
    slots.push(side);
    targets[side] += 1;
  }

  return { slots, targets };
}

export function createSceneOrganismPlan(preset: ScenePreset, crop: CropRect, rng: Rng): SceneOrganismPlan {
  const targetCrop = centeredCoverCrop(crop);
  const count = requiredOrganismCount(preset, rng);
  const coverage = createCoverageSlots(preset, count, rng);
  const organisms: PlannedOrganism[] = [];
  const openingMode = chooseOpeningMode(rng);

  for (let index = 0; index < count; index += 1) {
    const family = rng.weighted(familiesForPreset(preset));
    const side = coverage.slots[index] ?? rng.weighted(familyProfile(family).sideWeights);
    organisms.push({
      id: `organism-${index}`,
      family,
      side,
      root: pointForSide(rng, side, crop, targetCrop),
      layerKeys: layerKeysForFamily(family, preset, rng)
    });
  }

  return {
    openingMode,
    coverageSlots: coverage.slots,
    edgeTargets: coverage.targets,
    treeSilhouetteTarget: preset.name === "dense" ? 2 : preset.name === "balanced" ? 1 : 0,
    organisms
  };
}

export function createLayerPlantGraphs(layer: LayerConfig, light: LightZone, crop: CropRect, rng: Rng, organismPlan?: SceneOrganismPlan) {
  const forcedSides = forcedSidesForLayer(layer);
  const graphTotal = graphTotalForLayer(layer, forcedSides, rng);
  const centerCrop = centeredCoverCrop(crop);
  const graphs: ValidatedPlantGraph[] = [];
  const plannedOrganisms = organismPlan?.organisms.filter((organism) => organism.layerKeys.includes(layer.key) && layerSupportsFamily(layer, organism.family)) ?? [];

  plannedOrganisms.forEach((organism, index) => {
    const graph = createPlantGraph(`canopy-${layer.key}-${organism.id}-${index}`, rng, layer, light, crop, centerCrop, organism.side, organism, organismPlan?.openingMode);
    if (graph) graphs.push(graph);
  });

  if (organismPlan && (layer.key === "middle" || layer.key === "near" || layer.key === "foreground")) {
    const targetGraphCount = targetPlannedGraphCount(layer, graphTotal);
    let rescueAttempt = 0;
    while (graphs.length < targetGraphCount && rescueAttempt < 48) {
      const currentSides = new Set(graphs.map((graph) => graph.side));
      const missingSide = (["top", "right", "bottom", "left"] as const).find((side) => !currentSides.has(side));
      const side = missingSide ?? organismPlan.coverageSlots[rescueAttempt % organismPlan.coverageSlots.length] ?? forcedSides[rescueAttempt % forcedSides.length] ?? rng.weighted(fallbackCoverageWeights());
      const needsTree = organismPlan.treeSilhouetteTarget > 0 && layerSupportsFamily(layer, "tree") && !graphs.some((graph) => graph.family === "tree");
      const family = needsTree && rescueAttempt % 3 === 0 ? "tree" : rng.weighted(layer.key === "foreground" || layer.key === "near" || layer.key === "middle" ? [
        ...layer.plantFamilies,
        ...(layerSupportsFamily(layer, "tree") ? [{ value: "tree" as const, weight: layer.key === "middle" ? 1.1 : 1.6 }] : [])
      ] : layer.plantFamilies);
      const organism: PlannedOrganism = {
        id: `organism-${layer.key}-rescue-${graphs.length}-${rescueAttempt}`,
        family,
        side,
        root: pointForSide(rng, side, crop, centerCrop),
        layerKeys: [layer.key]
      };
      const graph = createPlantGraph(`canopy-${layer.key}-${organism.id}`, rng, layer, light, crop, centerCrop, side, organism, organismPlan.openingMode);
      if (graph) graphs.push(graph);
      rescueAttempt += 1;
    }

    if (organismPlan.treeSilhouetteTarget > 0 && layerSupportsFamily(layer, "tree") && !graphs.some((graph) => graph.family === "tree")) {
      let treeAttempt = 0;
      while (treeAttempt < 36 && !graphs.some((graph) => graph.family === "tree")) {
        const side = organismPlan.coverageSlots[treeAttempt % organismPlan.coverageSlots.length] ?? rng.weighted(fallbackCoverageWeights());
        const organism: PlannedOrganism = {
          id: `organism-${layer.key}-tree-rescue-${treeAttempt}`,
          family: "tree",
          side,
          root: pointForSide(rng, side, crop, centerCrop),
          layerKeys: [layer.key]
        };
        const graph = createPlantGraph(`canopy-${layer.key}-${organism.id}`, rng, layer, light, crop, centerCrop, side, organism, organismPlan.openingMode);
        if (graph) graphs.push(graph);
        treeAttempt += 1;
      }
    }
    return graphs;
  }

  for (let index = graphs.length; index < graphTotal; index += 1) {
    const forcedSide = forcedSides[index];
    const graph = createPlantGraph(`canopy-${layer.key}-${index}`, rng, layer, light, crop, forcedSide ? centerCrop : crop, forcedSide, undefined, organismPlan?.openingMode);
    if (graph) graphs.push(graph);
  }

  return graphs;
}

export function auditPlantGraphs(
  graphs: readonly ValidatedPlantGraph[],
  light: LightZone,
  layer: LayerConfig,
  openingMode: OpeningMode = "quiet",
  densityTarget = densityTargetForLayer(layer),
  organismPlan?: SceneOrganismPlan
): PlantGraphAudit {
  const audit: PlantGraphAudit = {
    graphCount: graphs.length,
    densityTarget,
    stemCount: 0,
    foliageCount: 0,
    rootSides: { top: 0, right: 0, bottom: 0, left: 0 },
    familyCounts: { tree: 0, bush: 0, vine: 0, fern: 0, grass: 0, podSpray: 0 },
    orphanStems: 0,
    orphanFoliage: 0,
    estimatedSvgNodes: 0,
    protectedZoneHits: 0,
    longStrokeCrossings: 0,
    rootVisibleInFullFrame: 0,
    mainStemTouchesFrame: 0,
    graphTouchesFrame: 0,
    minVisibleParentLength: Number.POSITIVE_INFINITY,
    maxConnectorLength: 0,
    leafAngleOutliers: 0,
    maxLeafBaseAttachmentDistance: 0,
    edgeCoverageMissingSides: 0,
    edgeCoverageSkew: 0,
    edgeSlotCount: organismPlan?.coverageSlots.length ?? 0,
    treeGraphCount: 0,
    curveProfileCounts: { arc: 0, sweep: 0, sCurve: 0, droop: 0, upright: 0 }
  };

  graphs.forEach((graph) => {
    audit.rootSides[graph.side] += 1;
    audit.familyCounts[graph.family] += 1;
    if (graph.family === "tree") audit.treeGraphCount += 1;
    audit.curveProfileCounts[graph.mainCurveProfile] += 1;
    audit.stemCount += graph.stems.length;
    audit.foliageCount += graph.foliage.length;
    audit.estimatedSvgNodes += 3 + graph.stems.length + graph.foliage.length;
    if (graph.visual.rootVisibleInFullFrame) audit.rootVisibleInFullFrame += 1;
    if (graph.visual.mainStemTouchesFrame) audit.mainStemTouchesFrame += 1;
    if (graph.visual.graphTouchesFrame) audit.graphTouchesFrame += 1;
    audit.minVisibleParentLength = Math.min(audit.minVisibleParentLength, graph.visual.visibleParentLength);

    const stemIds = new Set(graph.stems.map((stem) => stem.id));
    const attachmentIds = new Set(graph.attachments.map((attachment) => attachment.id));

    graph.stems.forEach((stem) => {
      if (stem.parentId && !stemIds.has(stem.parentId)) audit.orphanStems += 1;
      if (protectedStemCoverage(stem, light, openingModeForLayer(layer, openingMode)) > 0) audit.protectedZoneHits += 1;
      if (stemIsLongProtectedCrossing(stem, light, layer, openingMode)) audit.longStrokeCrossings += 1;
    });

    graph.foliage.forEach((foliage) => {
      if (!stemIds.has(foliage.stemId) || !attachmentIds.has(foliage.attachmentId)) audit.orphanFoliage += 1;
      const connectorLength = foliageConnectorLength(foliage);
      audit.maxConnectorLength = Math.max(audit.maxConnectorLength, connectorLength);
      audit.maxLeafBaseAttachmentDistance = Math.max(audit.maxLeafBaseAttachmentDistance, connectorLength);
      if (foliageAngleIsOutlier(foliage)) audit.leafAngleOutliers += 1;
      if (protectedZoneDistance(foliage.point, light, openingModeForLayer(layer, openingMode)) < 1) audit.protectedZoneHits += 1;
    });
  });

  const edgeCounts = Object.values(audit.rootSides);
  const nonZeroEdgeCounts = edgeCounts.filter((count) => count > 0);
  audit.edgeCoverageMissingSides = edgeCounts.filter((count) => count === 0).length;
  audit.edgeCoverageSkew = nonZeroEdgeCounts.length > 0 ? Math.max(...nonZeroEdgeCounts) / Math.max(1, Math.min(...nonZeroEdgeCounts)) : 0;

  return {
    ...audit,
    minVisibleParentLength: Number.isFinite(audit.minVisibleParentLength) ? audit.minVisibleParentLength : 0
  };
}
