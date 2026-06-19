import type { Rng } from "./random";

export const VIEWBOX = {
  width: 1000,
  height: 700
} as const;

export type CanopyPresetName = "balanced" | "flowing" | "dense" | "mixed";
export type LeafType =
  | "oval"
  | "lance"
  | "lobed"
  | "compound"
  | "needle"
  | "heart"
  | "fan"
  | "serrated"
  | "palmate"
  | "grassBlade"
  | "pod";
export type PlantFamily = "tree" | "bush" | "vine" | "fern" | "grass" | "podSpray";
export type LayerKey = "haze" | "mist" | "far" | "back" | "middle" | "near" | "foreground";
export type GrowthForm =
  | "archingBranch"
  | "hangingVine"
  | "compoundSpray"
  | "leafyStem"
  | "needleFan"
  | "treeBough"
  | "trunkColumn"
  | "forkedBranch"
  | "fernFrond"
  | "seedPodSpray";

export type Range = readonly [number, number];

export type LightZone = {
  x: number;
  y: number;
  rx: number;
  ry: number;
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayerConfig = {
  key: LayerKey;
  clusterCount: Range;
  leafCount: Range;
  leafScale: Range;
  branchWidth: Range;
  reach: Range;
  spread: Range;
  edgeBias: number;
  branchiness: number;
  leafTypes: readonly LeafType[];
  plantFamilies: readonly { value: PlantFamily; weight: number }[];
  growthForms: readonly GrowthForm[];
};

export type ScenePreset = {
  name: Exclude<CanopyPresetName, "mixed">;
  light: LightZone;
  layerConfigs: readonly LayerConfig[];
};

const presets: Record<Exclude<CanopyPresetName, "mixed">, ScenePreset> = {
  balanced: {
    name: "balanced",
    light: { x: 575, y: 300, rx: 225, ry: 175 },
    layerConfigs: [
      {
        key: "haze",
        clusterCount: [4, 6],
        leafCount: [5, 9],
        leafScale: [0.18, 0.32],
        branchWidth: [0.45, 0.95],
        reach: [145, 220],
        spread: [24, 50],
        edgeBias: 0.56,
        branchiness: 0.62,
        leafTypes: ["oval", "lance", "compound", "fan"],
        plantFamilies: [
          { value: "vine", weight: 2.4 },
          { value: "fern", weight: 1.7 },
          { value: "bush", weight: 1.1 },
          { value: "podSpray", weight: 0.6 }
        ],
        growthForms: ["archingBranch", "compoundSpray", "leafyStem", "fernFrond"]
      },
      {
        key: "mist",
        clusterCount: [4, 6],
        leafCount: [7, 12],
        leafScale: [0.24, 0.42],
        branchWidth: [0.58, 1.2],
        reach: [155, 230],
        spread: [28, 58],
        edgeBias: 0.65,
        branchiness: 0.68,
        leafTypes: ["oval", "lance", "compound", "fan"],
        plantFamilies: [
          { value: "vine", weight: 2 },
          { value: "fern", weight: 1.4 },
          { value: "bush", weight: 1.2 },
          { value: "podSpray", weight: 0.7 }
        ],
        growthForms: ["archingBranch", "compoundSpray", "leafyStem", "fernFrond"]
      },
      {
        key: "far",
        clusterCount: [8, 11],
        leafCount: [9, 16],
        leafScale: [0.34, 0.56],
        branchWidth: [0.88, 1.85],
        reach: [170, 250],
        spread: [34, 68],
        edgeBias: 0.72,
        branchiness: 0.82,
        leafTypes: ["oval", "oval", "compound", "compound", "lance", "heart", "fan"],
        plantFamilies: [
          { value: "bush", weight: 3 },
          { value: "vine", weight: 1.7 },
          { value: "fern", weight: 1.3 },
          { value: "podSpray", weight: 1.1 },
          { value: "tree", weight: 0.7 }
        ],
        growthForms: ["archingBranch", "compoundSpray", "leafyStem", "seedPodSpray"]
      },
      {
        key: "back",
        clusterCount: [8, 11],
        leafCount: [9, 16],
        leafScale: [0.44, 0.74],
        branchWidth: [1.25, 2.75],
        reach: [185, 280],
        spread: [38, 78],
        edgeBias: 0.78,
        branchiness: 0.88,
        leafTypes: ["oval", "oval", "compound", "compound", "lance", "heart", "fan"],
        plantFamilies: [
          { value: "bush", weight: 3.1 },
          { value: "tree", weight: 1.1 },
          { value: "vine", weight: 1.7 },
          { value: "fern", weight: 1.2 },
          { value: "podSpray", weight: 1 }
        ],
        growthForms: ["archingBranch", "compoundSpray", "leafyStem", "treeBough", "seedPodSpray"]
      },
      {
        key: "middle",
        clusterCount: [7, 9],
        leafCount: [10, 17],
        leafScale: [0.54, 0.88],
        branchWidth: [1.6, 3.45],
        reach: [205, 310],
        spread: [46, 92],
        edgeBias: 0.84,
        branchiness: 0.92,
        leafTypes: ["oval", "oval", "oval", "compound", "compound", "lobed", "lance", "serrated", "heart"],
        plantFamilies: [
          { value: "bush", weight: 3.1 },
          { value: "tree", weight: 1.6 },
          { value: "vine", weight: 1.6 },
          { value: "fern", weight: 1.2 },
          { value: "podSpray", weight: 0.9 }
        ],
        growthForms: ["archingBranch", "archingBranch", "compoundSpray", "leafyStem", "hangingVine", "treeBough", "seedPodSpray"]
      },
      {
        key: "near",
        clusterCount: [5, 7],
        leafCount: [8, 14],
        leafScale: [0.78, 1.32],
        branchWidth: [2.9, 6.8],
        reach: [250, 390],
        spread: [60, 118],
        edgeBias: 0.96,
        branchiness: 0.78,
        leafTypes: ["oval", "oval", "compound", "compound", "lobed", "serrated", "palmate"],
        plantFamilies: [
          { value: "bush", weight: 3 },
          { value: "tree", weight: 2 },
          { value: "vine", weight: 1.3 },
          { value: "fern", weight: 0.8 },
          { value: "podSpray", weight: 0.7 }
        ],
        growthForms: ["archingBranch", "archingBranch", "leafyStem", "compoundSpray", "hangingVine", "treeBough", "forkedBranch"]
      },
      {
        key: "foreground",
        clusterCount: [3, 4],
        leafCount: [5, 9],
        leafScale: [0.98, 1.62],
        branchWidth: [4.8, 9.4],
        reach: [290, 460],
        spread: [72, 142],
        edgeBias: 1,
        branchiness: 0.58,
        leafTypes: ["oval", "oval", "oval", "compound", "lobed", "palmate", "serrated"],
        plantFamilies: [
          { value: "tree", weight: 2.2 },
          { value: "bush", weight: 2.6 },
          { value: "vine", weight: 1.1 },
          { value: "grass", weight: 0.8 }
        ],
        growthForms: ["archingBranch", "leafyStem", "hangingVine", "treeBough"]
      }
    ]
  },
  flowing: {
    name: "flowing",
    light: { x: 610, y: 315, rx: 245, ry: 190 },
    layerConfigs: [
      {
        key: "haze",
        clusterCount: [4, 6],
        leafCount: [6, 10],
        leafScale: [0.17, 0.3],
        branchWidth: [0.42, 0.86],
        reach: [170, 250],
        spread: [34, 68],
        edgeBias: 0.54,
        branchiness: 0.68,
        leafTypes: ["lance", "compound", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 3.4 },
          { value: "fern", weight: 2.2 },
          { value: "grass", weight: 1.4 },
          { value: "podSpray", weight: 0.7 }
        ],
        growthForms: ["compoundSpray", "hangingVine", "archingBranch", "fernFrond"]
      },
      {
        key: "mist",
        clusterCount: [4, 6],
        leafCount: [8, 13],
        leafScale: [0.22, 0.38],
        branchWidth: [0.54, 1.1],
        reach: [180, 270],
        spread: [40, 78],
        edgeBias: 0.62,
        branchiness: 0.72,
        leafTypes: ["lance", "compound", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 3.2 },
          { value: "fern", weight: 2.4 },
          { value: "grass", weight: 1.4 },
          { value: "podSpray", weight: 0.8 }
        ],
        growthForms: ["compoundSpray", "hangingVine", "archingBranch", "fernFrond"]
      },
      {
        key: "far",
        clusterCount: [8, 11],
        leafCount: [9, 16],
        leafScale: [0.32, 0.52],
        branchWidth: [0.82, 1.7],
        reach: [190, 290],
        spread: [44, 86],
        edgeBias: 0.7,
        branchiness: 0.86,
        leafTypes: ["compound", "lance", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 3 },
          { value: "fern", weight: 2 },
          { value: "grass", weight: 1.2 },
          { value: "podSpray", weight: 0.9 },
          { value: "bush", weight: 0.8 }
        ],
        growthForms: ["compoundSpray", "hangingVine", "archingBranch", "fernFrond"]
      },
      {
        key: "back",
        clusterCount: [8, 11],
        leafCount: [10, 17],
        leafScale: [0.44, 0.78],
        branchWidth: [1.2, 2.55],
        reach: [215, 330],
        spread: [50, 96],
        edgeBias: 0.74,
        branchiness: 0.88,
        leafTypes: ["compound", "lance", "fan", "grassBlade", "oval"],
        plantFamilies: [
          { value: "vine", weight: 3.3 },
          { value: "fern", weight: 2.3 },
          { value: "grass", weight: 1.1 },
          { value: "podSpray", weight: 0.8 },
          { value: "bush", weight: 0.8 }
        ],
        growthForms: ["compoundSpray", "hangingVine", "archingBranch", "fernFrond", "seedPodSpray"]
      },
      {
        key: "middle",
        clusterCount: [7, 9],
        leafCount: [10, 18],
        leafScale: [0.56, 0.94],
        branchWidth: [1.5, 3.2],
        reach: [235, 370],
        spread: [58, 110],
        edgeBias: 0.78,
        branchiness: 0.88,
        leafTypes: ["lance", "compound", "oval", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 3.4 },
          { value: "fern", weight: 2.4 },
          { value: "grass", weight: 1 },
          { value: "podSpray", weight: 0.9 },
          { value: "bush", weight: 0.8 }
        ],
        growthForms: ["hangingVine", "hangingVine", "compoundSpray", "archingBranch", "fernFrond", "seedPodSpray"]
      },
      {
        key: "near",
        clusterCount: [5, 7],
        leafCount: [9, 15],
        leafScale: [0.76, 1.24],
        branchWidth: [2.7, 5.8],
        reach: [280, 440],
        spread: [70, 132],
        edgeBias: 0.9,
        branchiness: 0.7,
        leafTypes: ["lance", "compound", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 3.2 },
          { value: "fern", weight: 2 },
          { value: "grass", weight: 1.3 },
          { value: "bush", weight: 0.8 },
          { value: "tree", weight: 0.45 }
        ],
        growthForms: ["hangingVine", "compoundSpray", "archingBranch", "leafyStem", "fernFrond"]
      },
      {
        key: "foreground",
        clusterCount: [3, 4],
        leafCount: [6, 10],
        leafScale: [0.92, 1.46],
        branchWidth: [4.1, 8.2],
        reach: [310, 480],
        spread: [80, 150],
        edgeBias: 1,
        branchiness: 0.52,
        leafTypes: ["lance", "compound", "oval", "fan", "grassBlade"],
        plantFamilies: [
          { value: "vine", weight: 2.8 },
          { value: "fern", weight: 1.8 },
          { value: "grass", weight: 1.6 },
          { value: "bush", weight: 0.8 }
        ],
        growthForms: ["hangingVine", "compoundSpray", "leafyStem", "fernFrond"]
      }
    ]
  },
  dense: {
    name: "dense",
    light: { x: 585, y: 250, rx: 200, ry: 160 },
    layerConfigs: [
      {
        key: "haze",
        clusterCount: [5, 7],
        leafCount: [5, 9],
        leafScale: [0.14, 0.26],
        branchWidth: [0.42, 0.92],
        reach: [150, 230],
        spread: [24, 54],
        edgeBias: 0.66,
        branchiness: 0.78,
        leafTypes: ["needle", "compound", "lobed", "grassBlade"],
        plantFamilies: [
          { value: "tree", weight: 1.3 },
          { value: "bush", weight: 2.6 },
          { value: "grass", weight: 1.1 },
          { value: "podSpray", weight: 0.7 }
        ],
        growthForms: ["needleFan", "compoundSpray", "archingBranch", "forkedBranch"]
      },
      {
        key: "mist",
        clusterCount: [4, 6],
        leafCount: [6, 11],
        leafScale: [0.17, 0.31],
        branchWidth: [0.55, 1.24],
        reach: [160, 245],
        spread: [28, 62],
        edgeBias: 0.78,
        branchiness: 0.82,
        leafTypes: ["needle", "compound", "lobed", "grassBlade"],
        plantFamilies: [
          { value: "tree", weight: 1.7 },
          { value: "bush", weight: 2.4 },
          { value: "grass", weight: 1.2 },
          { value: "podSpray", weight: 0.8 }
        ],
        growthForms: ["needleFan", "compoundSpray", "archingBranch", "forkedBranch"]
      },
      {
        key: "far",
        clusterCount: [9, 12],
        leafCount: [8, 14],
        leafScale: [0.23, 0.4],
        branchWidth: [0.84, 1.86],
        reach: [180, 270],
        spread: [34, 74],
        edgeBias: 0.84,
        branchiness: 0.9,
        leafTypes: ["needle", "compound", "lobed", "serrated", "grassBlade"],
        plantFamilies: [
          { value: "bush", weight: 2.7 },
          { value: "tree", weight: 2.2 },
          { value: "grass", weight: 1 },
          { value: "podSpray", weight: 0.7 },
          { value: "vine", weight: 0.5 }
        ],
        growthForms: ["needleFan", "compoundSpray", "archingBranch", "forkedBranch"]
      },
      {
        key: "back",
        clusterCount: [9, 12],
        leafCount: [9, 15],
        leafScale: [0.34, 0.62],
        branchWidth: [1.3, 3.05],
        reach: [195, 300],
        spread: [38, 82],
        edgeBias: 0.88,
        branchiness: 0.94,
        leafTypes: ["needle", "compound", "lobed", "serrated", "grassBlade"],
        plantFamilies: [
          { value: "bush", weight: 2.8 },
          { value: "tree", weight: 2.4 },
          { value: "grass", weight: 0.9 },
          { value: "podSpray", weight: 0.7 },
          { value: "vine", weight: 0.45 }
        ],
        growthForms: ["needleFan", "compoundSpray", "archingBranch", "forkedBranch", "treeBough"]
      },
      {
        key: "middle",
        clusterCount: [8, 10],
        leafCount: [9, 15],
        leafScale: [0.38, 0.72],
        branchWidth: [1.65, 3.85],
        reach: [210, 330],
        spread: [42, 90],
        edgeBias: 0.92,
        branchiness: 0.96,
        leafTypes: ["lobed", "needle", "oval", "compound", "palmate", "serrated"],
        plantFamilies: [
          { value: "tree", weight: 2.9 },
          { value: "bush", weight: 2.8 },
          { value: "grass", weight: 0.8 },
          { value: "podSpray", weight: 0.7 },
          { value: "vine", weight: 0.4 }
        ],
        growthForms: ["archingBranch", "needleFan", "leafyStem", "compoundSpray", "treeBough", "forkedBranch"]
      },
      {
        key: "near",
        clusterCount: [5, 7],
        leafCount: [8, 13],
        leafScale: [0.68, 1.25],
        branchWidth: [3.35, 7.6],
        reach: [250, 410],
        spread: [54, 110],
        edgeBias: 0.98,
        branchiness: 0.82,
        leafTypes: ["lobed", "needle", "oval", "palmate", "serrated"],
        plantFamilies: [
          { value: "tree", weight: 3.2 },
          { value: "bush", weight: 2.3 },
          { value: "grass", weight: 0.8 },
          { value: "podSpray", weight: 0.5 }
        ],
        growthForms: ["archingBranch", "leafyStem", "needleFan", "archingBranch", "treeBough", "forkedBranch", "trunkColumn"]
      },
      {
        key: "foreground",
        clusterCount: [3, 4],
        leafCount: [5, 9],
        leafScale: [0.96, 1.52],
        branchWidth: [5.2, 10.6],
        reach: [300, 470],
        spread: [70, 145],
        edgeBias: 1,
        branchiness: 0.65,
        leafTypes: ["lobed", "oval", "needle", "palmate", "serrated"],
        plantFamilies: [
          { value: "tree", weight: 3.6 },
          { value: "bush", weight: 2.2 },
          { value: "grass", weight: 0.8 }
        ],
        growthForms: ["archingBranch", "leafyStem", "needleFan", "treeBough", "forkedBranch", "trunkColumn"]
      }
    ]
  }
};

export function resolvePreset(name: CanopyPresetName, rng: Rng): ScenePreset {
  if (name !== "mixed") return presets[name] ?? presets.balanced;
  return presets[rng.weighted([
    { value: "balanced", weight: 58 },
    { value: "flowing", weight: 26 },
    { value: "dense", weight: 16 }
  ])];
}
