# Procedural Canopy Notes

This document tracks the current homepage canopy implementation and the next planned generation work.

## Current Status

The canopy is now the live homepage artwork. Generator iteration should be checked directly on the homepage.

Current generation baseline:

- Graph-first plant generation is live.
- Plant families and expanded leaf definitions are live.
- Five depth bands are live.
- The artwork remains static after generation.
- The public component API is unchanged.

Current visual concern:

- The graph model proves that rendered objects can be connected in data, but the result can still feel visually disconnected.
- Too many independent rooted graphs can read as scattered fragments rather than a coherent canopy.
- Large diagonal stems can cross the middle and block the intended quiet/light opening.
- Uniform strokes and generic cubic stems can look like random slashes or crosses instead of botanical branch/stem structure.
- The next pass should prioritize visual grammar and elegance over adding more plant types.

Current public usage:

```astro
<CanopyArtwork preset="mixed" seed="auto" />
```

Current root contract:

```html
<div data-canopy-art data-preset="mixed" data-seed="auto" data-crop="fluid" data-texture="dither" data-reveal="mask"></div>
```

## Implementation

- `src/components/CanopyArtwork.astro` renders only the framed mount element.
- `src/pages/index.astro` uses `CanopyArtwork` as the homepage surface.
- `src/scripts/site.ts` initializes canopy artwork on first load and after app-style page swaps.
- `src/scripts/canopy/generateScene.ts` mounts a full inline SVG scene and handles the mask reveal state.
- `src/scripts/canopy/presets.ts` owns preset moods, layer counts, plant family weights, leaf type mixes, and depth ranges.
- `src/scripts/canopy/plantGraph.ts` builds and validates connected plant graphs before anything is rendered.
- `src/scripts/canopy/clusters.ts` renders validated graph stems, connectors, and leaf `<use>` nodes into SVG.
- `src/scripts/canopy/leafPaths.ts` defines reusable SVG leaf and pod shapes.
- `src/scripts/canopy/random.ts` provides deterministic seeded randomness.

## Visual Rules

- Monochrome direction: black background with grayscale and white foliage.
- The generator always creates a full `1000 x 700` viewBox scene.
- SVG rendering uses `preserveAspectRatio="xMidYMid slice"` so cropping is centered and cover-style.
- Forced growth uses a centered cover crop so tall/mobile crops still receive structural foliage.
- All visible growth should trace back to an edge/offscreen stem or a visible parent branch.
- Leaves, pods, grasses, and twigs are created from stored attachment points on a parent stem. Detached foliage is rejected before render.
- Main stems and side branches use butt or square line caps to avoid overly rounded ends.
- Depth uses solid layer colors, stroke weight, scale, density, detail level, and dither masks. Layer opacity is avoided so foliage does not show through itself.
- Texture is SVG-native dither/halftone masking clipped to foliage only.

## Motion

The canopy is intentionally static after generation.

Allowed motion:

- One-shot mask reveal on `.canopy-artwork::after`, with the white frame fading through `.canopy-artwork::before` over a permanent black under-frame.
- Home-logo regeneration uses the same mask: fade to black, replace the SVG while hidden, then fade the new artwork in.
- Reduced-motion mode shortens the reveal through the global reduced-motion rule.

Not allowed in the current baseline:

- Canopy CSS keyframe drift or sway.
- SVG `animate*` nodes.
- `requestAnimationFrame` loops for canopy motion.
- Animated filters or animated texture.

## Presets And Depth

- `balanced`: broadleaf/lobed/compound mix with an open light area.
- `flowing`: lance, compound, vine, and fern-leaning forms with more negative space.
- `dense`: heavier silhouettes, needle fans, trunks, forked branches, and stronger contrast.
- `mixed`: weighted random selection, with balanced most common.

Current depth bands:

- `mist`
- `far`
- `middle`
- `near`
- `foreground`

The generator may use all five bands per preset. Farther layers are smaller, thinner, and darker; near and foreground layers are heavier and brighter.

Recent QA baseline:

- 40 graph seeds sampled across `balanced`, `flowing`, `dense`, and `mixed`.
- No orphan stems or foliage were found in the graph data.
- All four sides were represented across sampled presets.
- Estimated SVG nodes stayed under 900, with the sampled maximum around 678.
- Browser samples on desktop and mobile had no console warnings/errors, no horizontal overflow, and no SVG animation nodes.

## Plant Graphs

The current generator is graph-first:

- Each plant starts with a root outside or on the full `1000 x 700` scene edge.
- A main stem curve is generated and sampled for its visible entry point.
- Child branches start from sampled points on their parent curve.
- Leaves, pods, and grass blades attach only to stored attachment points.
- The graph is validated before SVG rendering. Invalid graphs are discarded instead of rendered.

Current plant families:

- `tree`: trunk columns, forked branches, broad boughs, and heavier woody silhouettes.
- `bush`: dense edge shrubs, small branching sprays, and clustered broadleaf masses.
- `vine`: hanging vines, looping tendrils, and sparse lance leaves.
- `fern`: ordered fronds with paired leaflets attached to a central rib.
- `grass`: blade fans, reed-like clusters, and seed-head-adjacent forms from bottom or side edges.
- `podSpray`: seed pods, berries, and small capsules attached to branching stems.

Current leaf and foliage definitions:

- `oval`
- `lance`
- `lobed`
- `compound`
- `needle`
- `heart`
- `fan`
- `serrated`
- `palmate`
- `grassBlade`
- `pod`

## Legacy Growth Forms

The older preset `growthForms` list remains as a compatibility/mood hint while the graph-first plant family system takes over rendering decisions.

Legacy forms:

- `archingBranch`
- `hangingVine`
- `compoundSpray`
- `leafyStem`
- `needleFan`
- `treeBough`
- `trunkColumn`
- `forkedBranch`
- `fernFrond`
- `seedPodSpray`

## Next Development Plan

### 1. Rebuild Around Structural Organisms

Priority: make the scene read as a few coherent living structures, not many independent fragments.

- Generate roughly 3-7 major organisms per scene instead of dozens of similarly weighted clusters.
- Each organism should own a visible root/edge entry, a trunk or primary stem, secondary branches, twigs, and foliage.
- Most detail should belong to those organisms; avoid standalone mid-scene mini-plants.
- Keep forced edge coverage, but satisfy it through large organisms crossing into multiple edges where possible.
- Let presets vary organism mix: `balanced` gets a few trees/bushes/vines, `flowing` gets vines/ferns/reeds, `dense` gets heavier tree/bush structures.
- Treat the current graph system as a prototype to replace or heavily reshape, not a final architecture to keep layering on top of.

### 2. Protect The Middle

Priority: preserve a calm central opening so the composition does not become blocked by big white strokes.

- Define a central/off-center protected composition zone, aligned with the light opening.
- Forbid trunks, major branches, and large foreground leaves from crossing the protected zone.
- Allow only fine far-layer texture or small partial silhouettes near the edge of the zone.
- Add a coverage score for the protected zone and reject seeds that exceed it.
- Bias major organisms to arc around the opening rather than through it.
- Use the protected zone as a design field, not just a collision check: branches should appear to frame the opening.

### 3. Better Plant Shapes

Priority: make each family feel more botanically distinct.

- Add tree subtypes: `canopyBough`, `saplingTrunk`, `brokenLimb`, and `rootedFork`.
- Add bush subtypes: `brambleMass`, `roundShrub`, `hedgeEdge`, and `twigThicket`.
- Add vine subtypes: `loopingVine`, `thinTendril`, and `weightedHangingVine`.
- Add grass/reed subtypes: `reedFan`, `seedHeadGrass`, and `edgeSedge`.
- Add broad-leaf accent subtypes: palm-like fronds, large tropical leaves, and clustered heart leaves.
- Keep family subtypes internal to graph generation; do not add public component props.
- Do not add more visual variety until each subtype has a clear stem/branch grammar and placement rule.

### 4. More Graceful Growth

Priority: make stems look intentionally grown rather than angle-random.

- Replace simple angle ranges with curve profiles per plant family.
- Add curve tension, gravity, droop, fork angle, and taper settings to each family profile.
- Let child branches inherit tangent direction from the exact parent curve point.
- Add optional avoidance around the light zone so growth bends around the opening instead of only being rejected by it.
- Add minimum visible parent length before child attachments can appear, especially for mid-scene foliage.
- Remove or heavily limit long straight diagonal strokes unless they are clearly a trunk or major bough.
- Use branch hierarchy rules: trunk/main boughs are long and heavy; secondary branches are shorter; twigs are short and fine.
- Make forks asymmetric and botanically plausible, avoiding repeated X-shaped crossings.

### 5. Refined Stroke And Silhouette Rendering

Priority: make branches look like branches and stems look like stems.

- Replace major uniform strokes with tapered filled paths where practical.
- Make stems wider at the root and narrower toward the tip.
- Use square/butt caps only for cropped edge entries; use tapered tips for natural branch ends.
- Separate woody branches, soft stems, vines, reeds, and grass blades into distinct render styles.
- Keep connector strokes short and subordinate; long connectors should become actual stems or branches.
- Avoid stroke intersections that create accidental crosses unless they are deliberate forks.

### 6. Visual Attachment Guarantees

Priority: make floating artifacts impossible in the rendered image, not just in data.

- Require every visible child object to have a visible parent path segment leading back toward an edge.
- Reject foliage whose parent stem is mostly offscreen, hidden by crop, or too short to read.
- Reject stems that enter the crop only as isolated middle fragments.
- Require a minimum visible parent length before any leaf, pod, twig, or seed head can render.
- Check rendered bounding boxes against the protected center and against parent visibility.
- Treat failed visual validation as a resample, never as a partial render.

### 7. Stronger Graph Audits

Priority: keep the generator debuggable as it gets more refined.

- Add a small development-only graph audit helper that returns counts for orphan stems, orphan foliage, root sides, family counts, and estimated SVG nodes.
- Store graph metadata on rendered groups only where useful for QA: plant family, side, entry point, stem count, and foliage count.
- Keep side branches and foliage render-only outputs dependent on `ValidatedPlantGraph`.
- Treat failed graph validation as a resample, never as a partial render.
- Add visual-risk metrics: protected-zone coverage, long-stroke crossings, isolated visible fragments, and parent visibility length.
- Add an optional debug overlay for root points, parent chains, rejected branches, and the protected center zone.

### 8. Depth And Composition

Priority: add richer foreground/background separation without transparency artifacts.

- Tune the `mist` layer so it adds texture without competing with the foreground.
- Add occasional large edge silhouettes in foreground, but cap their size so they do not dominate every seed.
- Add density rules around the light zone to keep a clean opening while allowing partial overlap near the edges.
- Add per-family depth behavior: trees and bushes should anchor near/foreground more often; vines and ferns can span far/middle/near; grasses should mostly enter from bottom and side edges.
- Reduce the number of foreground structures; make each one more intentional.
- Use far layers for atmosphere and edge texture, not random competing structure.
- Let depth reinforce hierarchy: foreground frames, middle carries plant identity, far adds texture.

### 9. Elegance Bar

Priority: define what “good” means before adding complexity.

- The first read should be a framed canopy with a calm opening, not a pile of generated marks.
- Every major shape should have a clear role: frame, branch, stem, leaf mass, vine, grass, or texture.
- The composition should have varied scale: a few large anchors, medium supporting forms, and small texture.
- Avoid evenly distributed detail. Let some areas breathe.
- Prefer fewer, more legible silhouettes over more objects.
- Reject seeds that feel like confetti, random crosses, or a dense white blockage.

### 10. Optimization And Tooling

Priority: preserve the static, low-CPU baseline while the generator gets richer.

- Keep the typical SVG node budget under 900.
- Prefer grouped paths for connector strokes and `<use>` for foliage.
- Avoid introducing continuous animation until the plant system is visually mature and separately performance-tested.
- Add an optional local QA snippet or script outside the public UI for sampling presets and reporting graph/node metrics.
- Browser-check `/` after generator changes, including logo-click regeneration.

## Proposed Next Implementation Pass

The next code pass should be a visual-grammar refactor, not a small tuning pass.

Implementation direction:

- Add a scene-level composition planner before plant generation.
- Generate a protected center/light zone with max coverage rules.
- Generate a small set of major organisms with explicit roles and depth.
- Render major stems as tapered shapes where possible.
- Restrict foliage to visible parent chains with minimum parent length.
- Add visual validation and debug metrics before expanding plant variety further.

Expected outcome:

- Fewer floating-looking elements.
- Less middle blockage.
- Branches read as branches, vines as vines, ferns as ferns, grasses as grasses.
- More elegant negative space and stronger visual hierarchy.
- A calmer, more intentional homepage artwork that still varies by seed.

## QA Checklist

Run:

```sh
npm run build
```

Browser-check:

- `/` at desktop and mobile widths.
- `/` at desktop and mobile widths.
- App-style navigation from `/` to another page and back.
- Resize from a narrow initial viewport to a wide viewport without reloading.
- Click the A. Appel home logo while already on `/` to regenerate the artwork.

Confirm:

- The artwork fills the available nav-to-footer area.
- The crop is centered and feels natural on tall and wide frames.
- A complete full-frame scene is generated regardless of initial viewport size.
- No visible branches, pods, or leaves float without a connected parent.
- Graph-rendered foliage has matching `data-plant-family` groups and no detached child nodes.
- Plant families appear across seeds: trees/bushes in balanced and dense, vines/ferns/grasses in flowing, pods as occasional accents.
- Dither remains visible without muddying the black background.
- The mask reveal is smooth and long enough to cover generation.
- Clicking the home logo on `/` changes the resolved seed without a full page refresh.
- There are no relevant console warnings/errors.
- There is no horizontal overflow.
- No active canopy animation exists beyond the one-shot reveal transition.
- Typical SVG DOM size stays under roughly 900 nodes.
