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
  key: string;
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
        key: "mist",
        clusterCount: [3, 5],
        leafCount: [7, 11],
        leafScale: [0.28, 0.48],
        branchWidth: [0.7, 1.4],
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
        clusterCount: [7, 9],
        leafCount: [9, 15],
        leafScale: [0.42, 0.68],
        branchWidth: [1.1, 2.2],
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
        key: "middle",
        clusterCount: [8, 10],
        leafCount: [10, 17],
        leafScale: [0.64, 1.04],
        branchWidth: [1.9, 4.1],
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
        clusterCount: [6, 8],
        leafCount: [8, 14],
        leafScale: [1.02, 1.74],
        branchWidth: [3.6, 8.2],
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
        clusterCount: [4, 5],
        leafCount: [6, 10],
        leafScale: [1.35, 2.2],
        branchWidth: [6, 12],
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
        key: "mist",
        clusterCount: [3, 5],
        leafCount: [8, 12],
        leafScale: [0.26, 0.44],
        branchWidth: [0.65, 1.3],
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
        clusterCount: [7, 9],
        leafCount: [9, 15],
        leafScale: [0.4, 0.62],
        branchWidth: [1, 2],
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
        key: "middle",
        clusterCount: [8, 10],
        leafCount: [10, 18],
        leafScale: [0.68, 1.14],
        branchWidth: [1.8, 3.8],
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
        clusterCount: [6, 8],
        leafCount: [9, 15],
        leafScale: [1, 1.62],
        branchWidth: [3.4, 7],
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
        clusterCount: [4, 5],
        leafCount: [7, 11],
        leafScale: [1.25, 1.95],
        branchWidth: [5.2, 10.5],
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
        key: "mist",
        clusterCount: [3, 5],
        leafCount: [6, 10],
        leafScale: [0.2, 0.36],
        branchWidth: [0.65, 1.5],
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
        clusterCount: [7, 9],
        leafCount: [8, 13],
        leafScale: [0.28, 0.48],
        branchWidth: [1, 2.2],
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
        key: "middle",
        clusterCount: [8, 10],
        leafCount: [9, 15],
        leafScale: [0.46, 0.88],
        branchWidth: [2, 4.6],
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
        clusterCount: [6, 8],
        leafCount: [8, 13],
        leafScale: [0.88, 1.65],
        branchWidth: [4.2, 9.5],
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
        clusterCount: [4, 5],
        leafCount: [6, 10],
        leafScale: [1.35, 2.15],
        branchWidth: [7, 14],
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
