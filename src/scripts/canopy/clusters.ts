import { LEAF_BASE_ANCHORS } from "./leafPaths";
import type { LeafDefinitionMap } from "./leafPaths";
import { auditPlantGraphs, connectorSegment, createLayerPlantGraphs, densityTargetForLayer } from "./plantGraph";
import type { FoliageNode, Point, SceneOrganismPlan, StemSegment } from "./plantGraph";
import { VIEWBOX } from "./presets";
import type { CropRect, LayerConfig, LightZone } from "./presets";
import type { Rng } from "./random";

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgElement<K extends keyof SVGElementTagNameMap>(documentRef: Document, tagName: K) {
  return documentRef.createElementNS(SVG_NS, tagName);
}

function connectorScaleForLayer(layer: LayerConfig) {
  if (layer.key === "mist") return 0.48;
  if (layer.key === "far") return 0.64;
  if (layer.key === "middle") return 0.82;
  if (layer.key === "near") return 0.96;
  return 1.08;
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

function normalAt(stem: StemSegment, t: number): Point {
  const derivative = cubicDerivative(stem, t);
  const length = Math.hypot(derivative.x, derivative.y) || 1;
  return {
    x: -derivative.y / length,
    y: derivative.x / length
  };
}

function stemWidthAt(stem: StemSegment, t: number) {
  const tipRatio = stem.role === "main" ? 0.22 : stem.role === "branch" ? 0.14 : 0.08;
  const baseRatio = stem.role === "blade" ? 0.72 : 1;
  const taper = baseRatio - (baseRatio - tipRatio) * Math.pow(t, 0.86);
  return Math.max(0.18, stem.width * taper);
}

function angleDelta(a: number, b: number) {
  return Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);
}

function foliageConnectorLength(foliage: FoliageNode) {
  return Math.hypot(foliage.point.x - foliage.connectorStart.x, foliage.point.y - foliage.connectorStart.y);
}

function foliageAngleIsOutlier(foliage: FoliageNode) {
  const connectorLength = foliageConnectorLength(foliage);
  if (connectorLength < 1.2) return false;
  const connectorAngle = Math.atan2(foliage.point.y - foliage.connectorStart.y, foliage.point.x - foliage.connectorStart.x) * 180 / Math.PI;
  const leafAngle = foliage.rotation - 90;
  return angleDelta(connectorAngle, leafAngle) > 125;
}

function lightDistance(point: Point, light: LightZone) {
  const dx = (point.x - light.x) / light.rx;
  const dy = (point.y - light.y) / light.ry;
  return Math.sqrt(dx * dx + dy * dy);
}

function textureAllowed(point: Point, layer: LayerConfig, light: LightZone) {
  const distance = lightDistance(point, light);
  if (layer.key === "mist") return distance > 0.72;
  if (layer.key === "far") return distance > 0.82;
  if (layer.key === "middle") return distance > 1.02;
  if (layer.key === "near") return distance > 1.16;
  return distance > 1.28;
}

function edgeBiasedTexturePoint(rng: Rng, crop: CropRect): Point {
  const side = rng.weighted([
    { value: "top" as const, weight: 1 },
    { value: "right" as const, weight: 1 },
    { value: "bottom" as const, weight: 1.25 },
    { value: "left" as const, weight: 1 }
  ]);

  if (side === "top") return { x: rng.float(crop.x, crop.x + crop.width), y: rng.float(crop.y, crop.y + crop.height * 0.28) };
  if (side === "right") return { x: rng.float(crop.x + crop.width * 0.72, crop.x + crop.width), y: rng.float(crop.y, crop.y + crop.height) };
  if (side === "bottom") return { x: rng.float(crop.x, crop.x + crop.width), y: rng.float(crop.y + crop.height * 0.72, crop.y + crop.height) };
  return { x: rng.float(crop.x, crop.x + crop.width * 0.28), y: rng.float(crop.y, crop.y + crop.height) };
}

function appendTexturePath(documentRef: Document, parent: SVGGElement, point: Point, angle: number, length: number, width: number, opacity: number) {
  const rad = angle * Math.PI / 180;
  const end = {
    x: point.x + Math.cos(rad) * length,
    y: point.y + Math.sin(rad) * length
  };
  const path = createSvgElement(documentRef, "path");
  path.setAttribute("d", `M ${point.x.toFixed(1)} ${point.y.toFixed(1)} L ${end.x.toFixed(1)} ${end.y.toFixed(1)}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", width.toFixed(2));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("opacity", opacity.toFixed(3));
  parent.append(path);
}

function appendLayerTexture(documentRef: Document, layerGroup: SVGGElement, layer: LayerConfig, light: LightZone, crop: CropRect, rng: Rng) {
  const group = createSvgElement(documentRef, "g");
  group.classList.add("canopy-texture");
  const isAtmospheric = layer.key === "mist" || layer.key === "far";
  const atmosphereTarget = layer.key === "mist" ? 96 : layer.key === "far" ? 58 : 0;
  const textureTarget = layer.key === "far" ? 48 : layer.key === "middle" ? 40 : layer.key === "near" ? 26 : 0;
  let atmosphereNodeCount = 0;
  let textureNodeCount = 0;

  for (let index = 0; index < atmosphereTarget; index += 1) {
    let point = edgeBiasedTexturePoint(rng, crop);
    for (let attempt = 0; attempt < 12 && !textureAllowed(point, layer, light); attempt += 1) {
      point = edgeBiasedTexturePoint(rng, crop);
    }
    if (!textureAllowed(point, layer, light)) continue;
    const circle = createSvgElement(documentRef, "circle");
    circle.setAttribute("cx", point.x.toFixed(1));
    circle.setAttribute("cy", point.y.toFixed(1));
    circle.setAttribute("r", rng.float(layer.key === "mist" ? 0.45 : 0.35, layer.key === "mist" ? 1.55 : 1.05).toFixed(2));
    circle.setAttribute("fill", "currentColor");
    circle.setAttribute("opacity", rng.float(layer.key === "mist" ? 0.07 : 0.05, layer.key === "mist" ? 0.18 : 0.13).toFixed(3));
    group.append(circle);
    atmosphereNodeCount += 1;
  }

  if (isAtmospheric) {
    const contourCount = layer.key === "mist" ? 18 : 10;
    for (let index = 0; index < contourCount; index += 1) {
      const y = rng.float(crop.y + crop.height * 0.04, crop.y + crop.height * 0.96);
      const fromLeft = rng.chance(0.5);
      const startX = fromLeft ? rng.float(-20, VIEWBOX.width * 0.18) : rng.float(VIEWBOX.width * 0.82, VIEWBOX.width + 20);
      const length = rng.float(30, layer.key === "mist" ? 92 : 64);
      appendTexturePath(documentRef, group, { x: startX, y }, rng.float(-10, 10) + (fromLeft ? 0 : 180), length, layer.key === "mist" ? 0.42 : 0.34, rng.float(0.04, 0.1));
      atmosphereNodeCount += 1;
    }
  }

  for (let index = 0; index < textureTarget; index += 1) {
    let point = edgeBiasedTexturePoint(rng, crop);
    for (let attempt = 0; attempt < 12 && !textureAllowed(point, layer, light); attempt += 1) {
      point = edgeBiasedTexturePoint(rng, crop);
    }
    if (!textureAllowed(point, layer, light)) continue;
    appendTexturePath(
      documentRef,
      group,
      point,
      rng.weighted([
        { value: -58, weight: 1 },
        { value: -22, weight: 1.2 },
        { value: 22, weight: 1.2 },
        { value: 58, weight: 1 }
      ]) + rng.float(-8, 8),
      rng.float(layer.key === "near" ? 8 : 5, layer.key === "near" ? 22 : 16),
      layer.key === "near" ? 0.55 : 0.42,
      rng.float(layer.key === "near" ? 0.08 : 0.06, layer.key === "near" ? 0.2 : 0.15)
    );
    textureNodeCount += 1;
  }

  if (atmosphereNodeCount + textureNodeCount > 0) layerGroup.append(group);
  return { atmosphereNodeCount, textureNodeCount };
}

function taperedStemPath(stem: StemSegment) {
  const steps = stem.role === "twig" || stem.role === "blade" ? 8 : 12;
  const left: Point[] = [];
  const right: Point[] = [];

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const point = cubicPoint(stem, t);
    const normal = normalAt(stem, t);
    const halfWidth = stemWidthAt(stem, t) / 2;
    left.push({
      x: point.x + normal.x * halfWidth,
      y: point.y + normal.y * halfWidth
    });
    right.unshift({
      x: point.x - normal.x * halfWidth,
      y: point.y - normal.y * halfWidth
    });
  }

  const [start, ...rest] = [...left, ...right];
  return [
    `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`,
    ...rest.map((point) => `L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`),
    "Z"
  ].join(" ");
}

function appendStemPath(documentRef: Document, parent: SVGGElement, stem: StemSegment) {
  const path = createSvgElement(documentRef, "path");
  path.setAttribute("d", taperedStemPath(stem));
  path.setAttribute("fill", "currentColor");
  parent.append(path);
}

function appendConnectorPath(documentRef: Document, parent: SVGGElement, foliage: FoliageNode[], layer: LayerConfig) {
  if (foliage.length === 0) return;
  const path = createSvgElement(documentRef, "path");
  path.setAttribute("d", foliage.map((leaf) => connectorSegment(leaf.connectorStart, leaf.point)).join(" "));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", Math.max(0.48, connectorScaleForLayer(layer)).toFixed(2));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  parent.append(path);
}

function appendUse(documentRef: Document, parent: SVGGElement, leafDefs: LeafDefinitionMap, foliage: FoliageNode, rng: Rng) {
  const definitions = leafDefs[foliage.leafType];
  if (definitions.length === 0) return;
  const use = createSvgElement(documentRef, "use");
  const anchor = LEAF_BASE_ANCHORS[foliage.leafType];
  use.setAttribute("href", `#${rng.pick(definitions)}`);
  use.setAttribute(
    "transform",
    `translate(${foliage.point.x.toFixed(1)} ${foliage.point.y.toFixed(1)}) rotate(${foliage.rotation.toFixed(1)}) scale(${foliage.scaleX.toFixed(3)} ${foliage.scaleY.toFixed(3)}) translate(${(-anchor.x).toFixed(1)} ${(-anchor.y).toFixed(1)})`
  );
  parent.append(use);
}

export function appendLayerClusters(
  documentRef: Document,
  layerGroup: SVGGElement,
  layer: LayerConfig,
  light: LightZone,
  leafDefs: LeafDefinitionMap,
  crop: CropRect,
  rng: Rng,
  organismPlan?: SceneOrganismPlan
) {
  const graphs = createLayerPlantGraphs(layer, light, crop, rng, organismPlan);
  const densityTarget = densityTargetForLayer(layer);
  const audit = auditPlantGraphs(graphs, light, layer, organismPlan?.openingMode, densityTarget, organismPlan);
  const textureAudit = appendLayerTexture(documentRef, layerGroup, layer, light, crop, rng);

  layerGroup.dataset.graphCount = String(audit.graphCount);
  layerGroup.dataset.densityTarget = String(audit.densityTarget);
  layerGroup.dataset.stemCount = String(audit.stemCount);
  layerGroup.dataset.foliageCount = String(audit.foliageCount);
  layerGroup.dataset.orphanStems = String(audit.orphanStems);
  layerGroup.dataset.orphanFoliage = String(audit.orphanFoliage);
  layerGroup.dataset.protectedZoneHits = String(audit.protectedZoneHits);
  layerGroup.dataset.longStrokeCrossings = String(audit.longStrokeCrossings);
  layerGroup.dataset.estimatedSvgNodes = String(audit.estimatedSvgNodes);
  layerGroup.dataset.rootVisibleInFullFrame = String(audit.rootVisibleInFullFrame);
  layerGroup.dataset.mainStemTouchesFrame = String(audit.mainStemTouchesFrame);
  layerGroup.dataset.graphTouchesFrame = String(audit.graphTouchesFrame);
  layerGroup.dataset.minVisibleParentLength = audit.minVisibleParentLength.toFixed(2);
  layerGroup.dataset.organismCount = String(new Set(graphs.map((graph) => graph.organismId).filter(Boolean)).size);
  layerGroup.dataset.maxConnectorLength = audit.maxConnectorLength.toFixed(2);
  layerGroup.dataset.leafAngleOutliers = String(audit.leafAngleOutliers);
  layerGroup.dataset.maxLeafBaseAttachmentDistance = audit.maxLeafBaseAttachmentDistance.toFixed(2);
  layerGroup.dataset.edgeCoverageMissingSides = String(audit.edgeCoverageMissingSides);
  layerGroup.dataset.edgeCoverageSkew = audit.edgeCoverageSkew.toFixed(2);
  layerGroup.dataset.edgeSlotCount = String(audit.edgeSlotCount);
  layerGroup.dataset.treeGraphCount = String(audit.treeGraphCount);
  layerGroup.dataset.curveProfileCounts = JSON.stringify(audit.curveProfileCounts);
  layerGroup.dataset.atmosphereNodeCount = String(textureAudit.atmosphereNodeCount);
  layerGroup.dataset.textureNodeCount = String(textureAudit.textureNodeCount);

  graphs.forEach((graph) => {
    const group = createSvgElement(documentRef, "g");
    group.classList.add("canopy-cluster");
    if (graph.organismId) group.dataset.organismId = graph.organismId;
    group.dataset.plantFamily = graph.family;
    group.dataset.edgeSide = graph.side;
    group.dataset.entryT = graph.entryT.toFixed(3);
    group.dataset.stemCount = String(graph.stems.length);
    group.dataset.foliageCount = String(graph.foliage.length);
    group.dataset.rootVisibleInFullFrame = String(graph.visual.rootVisibleInFullFrame);
    group.dataset.mainStemTouchesFrame = String(graph.visual.mainStemTouchesFrame);
    group.dataset.graphTouchesFrame = String(graph.visual.graphTouchesFrame);
    group.dataset.visibleParentLength = graph.visual.visibleParentLength.toFixed(2);
    group.dataset.densityTarget = String(densityTarget);
    group.dataset.mainCurveProfile = graph.mainCurveProfile;
    group.dataset.maxConnectorLength = Math.max(0, ...graph.foliage.map(foliageConnectorLength)).toFixed(2);
    group.dataset.leafAngleOutliers = String(graph.foliage.filter(foliageAngleIsOutlier).length);
    group.dataset.maxLeafBaseAttachmentDistance = group.dataset.maxConnectorLength;

    const stems = createSvgElement(documentRef, "g");
    graph.stems.forEach((stem) => appendStemPath(documentRef, stems, stem));
    group.append(stems);

    appendConnectorPath(documentRef, group, graph.foliage, layer);

    const leafGroup = createSvgElement(documentRef, "g");
    graph.foliage.forEach((foliage) => appendUse(documentRef, leafGroup, leafDefs, foliage, rng));
    group.append(leafGroup);

    layerGroup.append(group);
  });
}
