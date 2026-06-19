# Maintenance Guide

This guide documents the current Astro site structure and the conventions to follow when making updates.

## Architecture

The site is a static Astro project. Most pages are generated from content collections, with shared chrome and scripts kept in Astro components and layout files.

- `src/layouts/BaseLayout.astro` wraps every page, sets metadata, renders the footer, and provides the site-wide lightbox shell.
- `src/components/SiteChrome.astro` renders desktop navigation, mobile navigation, the floating logo, and project hover previews.
- `src/components/Icon.astro` centralizes inline icon rendering.
- `src/components/CanopyArtwork.astro` renders the reusable procedural artwork mount point.
- `src/scripts/site.ts` initializes app-style navigation, page swaps, chrome behavior, canopy artwork, the lightbox, project index controls, and page-specific reinitializers.
- `src/scripts/canopy/` contains the seeded canopy generator, presets, leaf path definitions, cluster generation, and SVG mounting code.
- `src/pages/index.astro` renders the procedural canopy homepage.
- `src/pages/projects/index.astro` renders the searchable/filterable project index.
- `src/pages/projects/[slug].astro` renders individual project pages from project content entries.
- `src/pages/photos.astro` renders the photo grid from photo content entries.
- `src/pages/music.astro` renders the music page from music content entries.
- `src/data/projects.ts` contains sorting, grouping, tagging, and search helpers for projects.
- `src/data/photos.ts` contains photo column layout helpers.
- `src/data/site.ts` contains shared site metadata, contact links, PDF links, and the footer update date.
- `src/styles/global.css` contains global styles, responsive behavior, and page-specific UI rules.

## Content Collections

Content schemas live in `src/content.config.ts`. The build will fail if required frontmatter is missing or has the wrong shape.

### Projects

Project folders live at `src/content/projects/<folder>/index.md`.

Important fields:

- `title`: Display title.
- `slug`: Public route segment used by `/projects/[slug]/`.
- `subtitle`: Short project deck line.
- `projectId`: Display order. IDs should increase from oldest to newest; the site sorts higher IDs first.
- `completed`: Month completed, formatted as `YYYY-MM`. This drives visible date labels and year dividers.
- `thumbnail`: Local image used in the project index and nav preview.
- `home.show`: Legacy metadata kept for project curation; the current homepage no longer builds a project slideshow from it.
- `frame`: Primary project media. Use `type: "image"` with `image`, `type: "video"` with `poster` and `sources`, or `type: "youtube"` with `videoId` and `title`.
- `taxonomy`: Filter/search categories.
- `info`: Project location/client and notes.
- `gallery`: Optional additional images, videos, YouTube embeds, or GIFs. These are shown in the project media carousel.
- `portfolioLink`: Shows the portfolio PDF sentence on the project page. Preserve this field during copy edits unless the project page should intentionally gain or lose the PDF sentence.

Keep project images next to the project entry so Astro can validate and optimize them.

When editing project copy, update the Markdown body and `subtitle` only unless metadata really changed. As of the current portfolio set, InPulse (Live), Trax, and Ripple keep `portfolioLink: true`; FlipGrip, Party Piece, Glo-Kit, and Dualith keep `portfolioLink: false`.

When adding a new project, use the next highest `projectId`. The desktop nav year dividers are generated from `completed`, so a new year appears automatically when needed.

To add a hover preview animation, place a file named `preview.gif` in the project folder. The project index card will fade to it on hover/focus, and the desktop nav hover preview will use it instead of the static thumbnail.

Example YouTube gallery item:

```yaml
gallery:
  - type: "youtube"
    videoId: "VIDEO_ID"
    title: "Project demo"
```

### Photos

Photo folders live at `src/content/photos/<folder>/index.md`.

Fields:

- `title`
- `image`
- `alt` optional, but recommended

Photos are columnized by `src/data/photos.ts` and rendered through Astro image optimization. On the first Photos visit per browser tab, thumbnails start hidden before they are parsed and enter through a short decode-aware staggered fade when motion is allowed. Later app navigations and reloads in that tab remain visible without replaying the reveal; reduced-motion users also see them immediately. Fullscreen viewing is handled by the shared lightbox.

### Music

Music folders live at `src/content/music/<folder>/index.md`.

Fields:

- `title`
- `order`
- `audio` optional
- `hidden` optional

## Images

Displayed local images should use Astro image assets from `src/content/` or another `src/` folder. The current pages use `Image` from `astro:assets` for rendered project and photo images. The homepage canopy is generated as inline SVG at runtime.

Current responsive image surfaces:

- Project index cards: `src/pages/projects/index.astro`
- Project detail media and gallery: `src/pages/projects/[slug].astro`
- Photo grid: `src/pages/photos.astro`
- Nav hover previews: generated at a fixed 3:2 crop with `getImage()` in `src/components/SiteChrome.astro`

Lightbox links intentionally point at the original image asset URL (`image.src`) so users can open the full image, while the displayed thumbnail/page image is optimized by Astro.

Desktop nav previews should stay visually consistent:

- Static thumbnail previews are generated as cropped `420x280` WebP images.
- The preview frame uses a fixed `3 / 2` aspect ratio and `object-fit: cover`.
- If `preview.gif` exists in a project folder, the GIF bypasses Astro transforms and is cropped by the same preview frame.
- Preview image state is cleared when hiding/loading so stale image dimensions do not flash.

Use `public/` for files that should not be transformed, such as:

- PDFs
- favicons
- static files that need a stable public path
- committed social preview images

`public/assets/social/home-preview.png` is the 1200x630 PNG used by the Open Graph and Twitter metadata. Keep it as a desktop homepage capture with navigation, framed canopy, and footer. Create replacements from a fixed capture seed (currently `social-preview-20260619`) without changing the live homepage's `seed="auto"` behavior.

When replacing `public/favicon.svg`, also bump the cache-busting query string in `src/layouts/BaseLayout.astro` and run `npm run build` so `dist/favicon.svg` matches the public source.

## Homepage Canopy

The homepage canopy lives in `src/pages/index.astro` and reuses `src/components/CanopyArtwork.astro`.

Implementation notes:

- The component API is `<CanopyArtwork preset="mixed" seed="auto" />`.
- The root element contract is `[data-canopy-art]` with developer-facing `data-preset`, `data-seed`, `data-crop`, `data-texture`, and `data-reveal` attributes.
- `src/scripts/site.ts` calls `initCanopyArtwork()` after initial load and after Astro-style page swaps.
- The generator always creates a full `1000 x 700` SVG scene and uses `preserveAspectRatio="xMidYMid slice"` so responsive cropping stays centered.
- Forced structural growth is generated against a centered cover crop so tall/mobile frames do not reveal an empty or off-center composition.
- `src/scripts/canopy/plantGraph.ts` generates rooted plant graphs before rendering, so stems, branches, pods, grasses, and leaves all have a parent chain back to an edge/offscreen root.
- Current plant families are `tree`, `bush`, `vine`, `fern`, `grass`, and `podSpray`; presets weight these families by mood.
- The generator uses five depth bands: `mist`, `far`, `middle`, `near`, and `foreground`.
- Current planning notes treat the graph pass as a structural prototype, not the final visual grammar. The next canopy pass should reduce independent fragments, protect the middle opening, and make branches/stems read botanically rather than as random diagonal strokes.
- The artwork is static after mount. There are no canopy CSS keyframes, SVG animation nodes, requestAnimationFrame loops, or animated filters.
- Depth comes from solid grayscale layer colors, stroke weight, scale, density, and dither masks rather than layer opacity.
- The reveal is a one-shot black overlay on `.canopy-artwork`; the SVG remains fully opaque so overlapping foliage does not become transparent through itself.
- Typical rendered SVG size should stay under roughly 900 nodes; recent graph samples are well below that budget.

When changing the canopy, verify:

- Direct homepage loads show the framed canopy with a smooth masked reveal.
- Mobile fills the nav-to-footer gap evenly without horizontal overflow.
- The crop remains visually centered when moving between narrow and wide viewports.
- Expanding from a small initial window still reveals a complete full-frame scene.
- Mid-scene leaves, pods, and branches visually connect to an edge-origin stem or parent branch.
- Seed samples across `balanced`, `flowing`, `dense`, and `mixed` include varied plant families without detached graph nodes.
- Large foreground or near-layer strokes do not block the central opening or create accidental X-shaped/random-cross compositions.
- No active animation is introduced unless explicitly planned and performance-tested.
- `/` initializes correctly after direct loads and app-style navigation.

## Floating Logo

The floating logo behavior is in `src/components/SiteChrome.astro`; styling is in `src/styles/global.css`.

Implementation notes:

- Desktop and mobile logos both use `data-brand-bouncer`.
- Position and velocity are stored in `sessionStorage` so the logo does not restart from the origin on every page.
- The script applies the first transform before adding `is-positioned`.
- The opacity fade is enabled only after `is-positioned`, then `is-ready` starts the fade.
- This sequencing is meant to avoid fading from the fallback origin.
- Dragging the logo updates velocity and prevents accidental navigation after a drag.
- `prefers-reduced-motion` skips the animation and marks the logo ready immediately.

When changing this behavior, verify both desktop and mobile breakpoints.

## Navigation

Desktop navigation is fixed on the left. Mobile uses a top header, quick links, and a full-screen menu overlay.

Project navigation data comes from `getProjectGroups()` in `src/data/projects.ts`.

Site navigation is enhanced in `src/scripts/site.ts`:

- Same-origin internal links are intercepted when they can be handled safely.
- The next document is fetched, parsed, and only `main#main` is swapped.
- `<title>`, body/page state, active navigation state, and the mobile menu state are updated after swaps.
- The native View Transition API is used when available.
- External links, downloads, file links, modifier-clicks, hash-only jumps, and failed fetches fall back to normal browser navigation.
- `xppel:page-load` fires after the initial load and after enhanced swaps so page initializers can re-bind idempotently.

Each nav entry uses `.nav-link-row`: its arrow is a fixed, non-interactive first column and its `.nav-label-link` reserves the bold active-label width through `data-nav-label`. Apply that structure to desktop links, mobile quick links, and mobile menu links so arrows do not move when the active page becomes heavier. `navigateApp()` marks the destination active before its fetch completes. Keep the 1.2rem gap between the Projects row and its year-grouped project list.

The global nav intentionally omits the Email link. Keep email contact available on the About page contact links instead.

The skip-to-content link was removed intentionally because it appeared visually during normal browsing. Keep `main#main` in place for landmarks and page swaps.

The project hover preview uses a generated, cropped WebP preview URL from `getImage()` to keep the preview lightweight. If `preview.gif` exists in a project folder, that GIF is used in the nav preview instead.

## Project Index

The project index is server-rendered and then hydrated by `src/scripts/site.ts`.

Implementation notes:

- A small head boot script reads URL/session state and sets initial project index view/size attributes before first paint.
- CSS mirrors those attributes so the selected view and size are applied before JavaScript hydration finishes.
- Hydrated controls remain the source of truth after load and after app-style navigation swaps.
- Session storage is the persistence boundary for view/size/search/filter state; do not switch to cross-session storage unless that behavior is explicitly requested.
- Mobile grid sizes are fixed as `S = 4`, `M = 3`, and `L = 2` columns.
- Mobile list view uses larger images than desktop list view.
- Mobile list thumbnail frames retain the active size's inset padding and rounded corners; do not reset the frame at the mobile breakpoint.
- Mobile list size `S` hides summary text.
- Mobile list sizes `M` and `L` let summaries fill remaining text-column height, so larger frames naturally show more text.
- Tags are kept to one compact visual line on mobile.
- Filter-option labels must wrap within their grid cell; retain the zero-overflow behavior at desktop and mobile widths.
- Use `auto-fill` for the desktop card grid so one or two filtered results keep their selected card width instead of expanding into unused tracks.

When changing project index controls, verify there is no visible size/view flicker on direct `/projects/` loads or when navigating back to `/projects/` through app-style navigation. In particular, switching to list mode, leaving the page, and returning during the same session should stay in list mode immediately and after hydration settles.

## Lightbox

The lightbox is defined in `src/layouts/BaseLayout.astro`.

Any anchor with `data-lightbox-item` participates in the lightbox. Items are sorted by `data-lightbox-index`.

The rendered image in the page can be optimized by Astro, but the anchor `href` should point to the original image URL so the lightbox can open the full image.

Implementation notes:

- Opening starts immediately from the clicked thumbnail/current image rect.
- The clicked thumbnail is used as the first visible placeholder while the full image decodes in the background.
- On open, the lightbox frame gets image-specific aspect-ratio CSS variables before the full image swaps in, so fullscreen photos do not grow or snap after loading.
- During next/previous navigation, the current image fades out before the source and frame aspect ratio change, then the new image fades back in. Do not update the visible frame dimensions mid-fade.
- Closing animates back to the triggering image rect and fades the backdrop before hiding the lightbox.
- Escape closes without restoring a visible blue focus ring.
- Horizontal swipes move between lightbox items when multiple images are available.

## Footer

The footer is in `src/layouts/BaseLayout.astro`.

The displayed update date comes from `site.updated` in `src/data/site.ts` and is formatted from the local date when the static site builds. Do not manually edit a date string; run the production build on the day of release.

## Styling Conventions

- Keep shared tokens in `:root` at the top of `src/styles/global.css`.
- Desktop defaults come first; mobile overrides live in the `@media (max-width: 760px)` block.
- Avoid changing global `img` rules to fix one page. Prefer page-specific classes such as `.project-card-thumb`, `.project-frame`, or `.photo-link`.
- Keep interactive hit areas stable with explicit dimensions or fixed containers.
- For image surfaces, put border radius and clipping on a stable wrapper when Astro image output or object-fit behavior could vary.
- Visible browser focus outlines are intentionally suppressed throughout the site. Use hover, active, selected, opacity, and border treatments for interaction feedback.
- When active text gets heavier, reserve the heavier width with hidden sizing content instead of allowing neighboring nav items or arrows to shift.
- Keep the centered site shell capped at the desktop max width so ultrawide screens show even black margins outside the site.

## QA Checklist

Run:

```sh
npm run build
```

Browser-check:

- Homepage at desktop width.
- Homepage at mobile width.
- Project index grid and list views.
- One project page.
- Photos page.
- Mobile menu open/close.
- Lightbox open/close.
- App-style navigation between homepage, projects, project detail pages, photos, music, and about.
- Browser back/forward after app-style navigation.

Specific visual checks:

- Floating logo fades in after it is positioned.
- Homepage canopy is centered, framed, dithered, and fills the available nav-to-footer area.
- Direct homepage loads show a smooth masked reveal without transparent overlapping foliage.
- Homepage canopy remains static after generation with no animation loops or SVG animation nodes.
- Homepage canopy keeps a complete full-frame composition when resizing from mobile to desktop.
- Lightbox responds to horizontal swipes on touch devices.
- Project cards do not crop thumbnails unexpectedly.
- Project index direct load does not flicker between view or size states.
- Mobile grid sizes render as S = 4, M = 3, and L = 2 columns.
- Mobile list size S hides summaries, while M and L show adaptive summaries.
- Photo grid images load with correct aspect ratios and fade in sequentially after decoding; reduced-motion users see them immediately.
- Photos opened in the fullscreen lightbox keep a stable size while loading and moving between images.
- Desktop nav previews are consistently cropped 3:2 with no black bars.
- Desktop and mobile nav labels do not shift when active text gets heavier.
- Project filter labels wrap without overlapping or horizontal overflow.
- Lightbox Escape followed by Space/Tab does not show a blue focus ring.
- Footer date is accurate.
- No console errors or framework overlays.
