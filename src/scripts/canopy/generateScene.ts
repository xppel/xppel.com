import { appendAtmosphericVeil, appendLayerClusters } from "./clusters";
import { createLeafDefinitions } from "./leafPaths";
import { createSceneOrganismPlan } from "./plantGraph";
import type { CanopyPresetName, CropRect } from "./presets";
import { resolvePreset, VIEWBOX } from "./presets";
import { createRng, resolveSeed } from "./random";

const SVG_NS = "http://www.w3.org/2000/svg";
const GENERATION_CROP: CropRect = {
  x: 0,
  y: 0,
  width: VIEWBOX.width,
  height: VIEWBOX.height
};
const CANOPY_REFRESH_COVER_MS = 460;

type CanopyElement = HTMLElement & {
  dataset: DOMStringMap & {
    canopyBound?: string;
    preset?: string;
    reveal?: string;
    canopyRefreshing?: string;
    seed?: string;
    texture?: string;
    visibleCropX?: string;
    visibleCropY?: string;
    visibleCropWidth?: string;
    visibleCropHeight?: string;
    organismCount?: string;
    openingMode?: string;
    depthLayerCount?: string;
    atmosphereVeilNodeCount?: string;
    atmosphereVeilBandCount?: string;
  };
};

function createSvgElement<K extends keyof SVGElementTagNameMap>(documentRef: Document, tagName: K) {
  return documentRef.createElementNS(SVG_NS, tagName);
}

function isPresetName(value: string | undefined): value is CanopyPresetName {
  return value === "balanced" || value === "flowing" || value === "dense" || value === "mixed";
}

function clearCanopy(root: HTMLElement) {
  root.querySelectorAll("svg").forEach((svg) => svg.remove());
}

function createSvg(documentRef: Document) {
  const svg = createSvgElement(documentRef, "svg");
  svg.classList.add("canopy-svg");
  svg.setAttribute("viewBox", `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Procedural black and white forest canopy");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  return svg;
}

function getVisibleCropRect(root: HTMLElement): CropRect {
  const rect = root.getBoundingClientRect();
  const frameWidth = rect.width || VIEWBOX.width;
  const frameHeight = rect.height || VIEWBOX.height;
  const frameAspect = frameWidth / Math.max(1, frameHeight);
  const viewAspect = VIEWBOX.width / VIEWBOX.height;

  if (frameAspect > viewAspect) {
    const visibleHeight = VIEWBOX.width / frameAspect;
    return {
      x: 0,
      y: (VIEWBOX.height - visibleHeight) / 2,
      width: VIEWBOX.width,
      height: visibleHeight
    };
  }

  const visibleWidth = VIEWBOX.height * frameAspect;
  return {
    x: (VIEWBOX.width - visibleWidth) / 2,
    y: 0,
    width: visibleWidth,
    height: VIEWBOX.height
  };
}

function recordCropDataset(root: CanopyElement, crop: CropRect, visibleCrop: CropRect) {
  root.dataset.cropX = crop.x.toFixed(2);
  root.dataset.cropY = crop.y.toFixed(2);
  root.dataset.cropWidth = crop.width.toFixed(2);
  root.dataset.cropHeight = crop.height.toFixed(2);
  root.dataset.visibleCropX = visibleCrop.x.toFixed(2);
  root.dataset.visibleCropY = visibleCrop.y.toFixed(2);
  root.dataset.visibleCropWidth = visibleCrop.width.toFixed(2);
  root.dataset.visibleCropHeight = visibleCrop.height.toFixed(2);
}

function addDitherMask(documentRef: Document, defs: SVGDefsElement, rng: ReturnType<typeof createRng>, prefix: string) {
  const patternId = `${prefix}-dither-pattern`;
  const sparsePatternId = `${prefix}-dither-sparse-pattern`;
  const maskId = `${prefix}-dither-mask`;
  const pattern = createSvgElement(documentRef, "pattern");
  pattern.id = patternId;
  pattern.setAttribute("width", "7");
  pattern.setAttribute("height", "7");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", `rotate(${rng.pick([-18, -11, 9, 16])})`);

  [
    { cx: 1.6, cy: 1.9, r: 0.82, opacity: 0.76 },
    { cx: 5.4, cy: 4.7, r: 0.64, opacity: 0.64 },
    { cx: 3.3, cy: 6.1, r: 0.42, opacity: 0.5 }
  ].forEach((dot) => {
    const circle = createSvgElement(documentRef, "circle");
    circle.setAttribute("cx", String(dot.cx));
    circle.setAttribute("cy", String(dot.cy));
    circle.setAttribute("r", String(dot.r));
    circle.setAttribute("fill", "#000");
    circle.setAttribute("opacity", String(dot.opacity));
    pattern.append(circle);
  });

  const sparsePattern = createSvgElement(documentRef, "pattern");
  sparsePattern.id = sparsePatternId;
  sparsePattern.setAttribute("width", "23");
  sparsePattern.setAttribute("height", "23");
  sparsePattern.setAttribute("patternUnits", "userSpaceOnUse");
  sparsePattern.setAttribute("patternTransform", `rotate(${rng.pick([-7, 5, 12])})`);

  [
    { cx: 5.5, cy: 6.5, r: 1.45, opacity: 0.68 },
    { cx: 17.2, cy: 15.7, r: 1.05, opacity: 0.54 }
  ].forEach((dot) => {
    const circle = createSvgElement(documentRef, "circle");
    circle.setAttribute("cx", String(dot.cx));
    circle.setAttribute("cy", String(dot.cy));
    circle.setAttribute("r", String(dot.r));
    circle.setAttribute("fill", "#000");
    circle.setAttribute("opacity", String(dot.opacity));
    sparsePattern.append(circle);
  });

  const mask = createSvgElement(documentRef, "mask");
  mask.id = maskId;
  mask.setAttribute("x", "0");
  mask.setAttribute("y", "0");
  mask.setAttribute("width", String(VIEWBOX.width));
  mask.setAttribute("height", String(VIEWBOX.height));
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("maskContentUnits", "userSpaceOnUse");

  const base = createSvgElement(documentRef, "rect");
  base.setAttribute("width", String(VIEWBOX.width));
  base.setAttribute("height", String(VIEWBOX.height));
  base.setAttribute("fill", "#fff");
  mask.append(base);

  const texture = createSvgElement(documentRef, "rect");
  texture.setAttribute("width", String(VIEWBOX.width));
  texture.setAttribute("height", String(VIEWBOX.height));
  texture.setAttribute("fill", `url(#${patternId})`);
  texture.setAttribute("opacity", "0.46");
  mask.append(texture);

  const sparseTexture = createSvgElement(documentRef, "rect");
  sparseTexture.setAttribute("width", String(VIEWBOX.width));
  sparseTexture.setAttribute("height", String(VIEWBOX.height));
  sparseTexture.setAttribute("fill", `url(#${sparsePatternId})`);
  sparseTexture.setAttribute("opacity", "0.34");
  mask.append(sparseTexture);

  defs.append(pattern, sparsePattern, mask);
  return maskId;
}

export function mountCanopyArtwork(root: CanopyElement) {
  root.classList.remove("is-canopy-ready");
  root.classList.remove("is-canopy-refreshing");
  const seed = resolveSeed(root.dataset.seed);
  const rng = createRng(seed);
  const requestedPreset = isPresetName(root.dataset.preset) ? root.dataset.preset : "mixed";
  const preset = resolvePreset(requestedPreset, rng);
  const documentRef = root.ownerDocument;
  const crop = GENERATION_CROP;
  const visibleCrop = getVisibleCropRect(root);
  const svg = createSvg(documentRef);
  const defs = createSvgElement(documentRef, "defs");
  const prefix = `canopy-${seed.replace(/[^a-z0-9_-]/gi, "").slice(0, 24) || "seed"}`;
  const leafDefs = createLeafDefinitions(documentRef, defs, rng, prefix);
  const textureMaskId = root.dataset.texture === "none" ? "" : addDitherMask(documentRef, defs, rng, prefix);
  const organismPlan = createSceneOrganismPlan(preset, crop, rng);
  svg.append(defs);

  const background = createSvgElement(documentRef, "rect");
  background.setAttribute("width", String(VIEWBOX.width));
  background.setAttribute("height", String(VIEWBOX.height));
  background.setAttribute("fill", "#000");
  svg.append(background);

  const atmosphereAudit = appendAtmosphericVeil(documentRef, svg, preset.light, crop, rng);
  const depthLayerCount = preset.layerConfigs.filter((layer) => layer.key === "haze" || layer.key === "back").length;
  svg.dataset.depthLayerCount = String(depthLayerCount);
  svg.dataset.atmosphereVeilNodeCount = String(atmosphereAudit.veilNodeCount);
  svg.dataset.atmosphereVeilBandCount = String(atmosphereAudit.veilBandCount);

  preset.layerConfigs.forEach((layer) => {
    const layerGroup = createSvgElement(documentRef, "g");
    layerGroup.classList.add("canopy-layer", `canopy-layer-${layer.key}`);
    if (textureMaskId) layerGroup.setAttribute("mask", `url(#${textureMaskId})`);
    appendLayerClusters(documentRef, layerGroup, layer, preset.light, leafDefs, crop, rng, organismPlan);
    svg.append(layerGroup);
  });

  root.dataset.resolvedPreset = preset.name;
  root.dataset.resolvedSeed = seed;
  root.dataset.organismCount = String(organismPlan.organisms.length);
  root.dataset.openingMode = organismPlan.openingMode;
  root.dataset.depthLayerCount = String(depthLayerCount);
  root.dataset.atmosphereVeilNodeCount = String(atmosphereAudit.veilNodeCount);
  root.dataset.atmosphereVeilBandCount = String(atmosphereAudit.veilBandCount);
  recordCropDataset(root, crop, visibleCrop);
  clearCanopy(root);
  root.append(svg);
  if (root.dataset.reveal === "none") {
    root.classList.add("is-canopy-ready");
  } else {
    window.setTimeout(() => root.classList.add("is-canopy-ready"), 32);
  }
}

export function refreshCanopyArtwork(root: HTMLElement) {
  const canopyRoot = root as CanopyElement;
  if (canopyRoot.dataset.canopyRefreshing === "true") return;
  if (canopyRoot.dataset.reveal === "none") {
    mountCanopyArtwork(canopyRoot);
    return;
  }

  canopyRoot.dataset.canopyRefreshing = "true";
  canopyRoot.classList.add("is-canopy-refreshing");
  canopyRoot.classList.remove("is-canopy-ready");

  window.setTimeout(() => {
    mountCanopyArtwork(canopyRoot);
    delete canopyRoot.dataset.canopyRefreshing;
  }, CANOPY_REFRESH_COVER_MS);
}

export function initCanopyArtwork() {
  document.querySelectorAll("[data-canopy-art]").forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    const root = element as CanopyElement;
    if (root.dataset.canopyBound === "true") return;
    root.dataset.canopyBound = "true";
    mountCanopyArtwork(root);
  });
}
