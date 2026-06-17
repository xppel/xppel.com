# Maintenance Guide

This guide documents the current Astro site structure and the conventions to follow when making updates.

## Architecture

The site is a static Astro project. Most pages are generated from content collections, with shared chrome and scripts kept in Astro components and layout files.

- `src/layouts/BaseLayout.astro` wraps every page, sets metadata, renders the footer, and provides the site-wide lightbox shell.
- `src/components/SiteChrome.astro` renders desktop navigation, mobile navigation, the floating logo, and project hover previews.
- `src/components/Icon.astro` centralizes inline icon rendering.
- `src/scripts/site.ts` initializes app-style navigation, page swaps, chrome behavior, sliders, swipe gestures, the lightbox, project index controls, and page-specific reinitializers.
- `src/pages/index.astro` renders the homepage slideshow.
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
- `thumbnail`: Local image used in the homepage slideshow, project index, and nav preview.
- `home.show`: Controls homepage slideshow inclusion.
- `frame`: Primary project media. Use `type: "image"` with `image`, `type: "video"` with `poster` and `sources`, or `type: "youtube"` with `videoId` and `title`.
- `taxonomy`: Filter/search categories.
- `info`: Project location/client and notes.
- `gallery`: Optional additional images, videos, YouTube embeds, or GIFs. These are shown in the project media carousel.
- `portfolioLink`: Shows the portfolio PDF sentence on the project page.

Keep project images next to the project entry so Astro can validate and optimize them.

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

Photos are columnized by `src/data/photos.ts` and rendered through Astro image optimization. Photo thumbnails keep their natural page layout, while fullscreen viewing is handled by the shared lightbox.

### Music

Music folders live at `src/content/music/<folder>/index.md`.

Fields:

- `title`
- `order`
- `audio` optional
- `hidden` optional

## Images

Displayed local images should use Astro image assets from `src/content/` or another `src/` folder. The current pages use `Image` from `astro:assets` for rendered project, photo, and slideshow images.

Current responsive image surfaces:

- Homepage slideshow: `src/pages/index.astro`
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

When replacing `public/favicon.svg`, also bump the cache-busting query string in `src/layouts/BaseLayout.astro` and run `npm run build` so `dist/favicon.svg` matches the public source.

## Homepage Slideshow

The homepage slideshow lives in `src/pages/index.astro`, with layout styles in `src/styles/global.css`.

Implementation notes:

- The slideshow list is built from projects where `home.show` is true.
- Slides are ordered by `projectId`, highest first.
- The first slide is rendered as the current slide in Astro so first paint matches the enhanced layout.
- Each `.home-slide-link` receives image-specific aspect-ratio CSS variables from Astro image metadata.
- CSS sizes the slide link from the available stage height with `--home-slide-scale`, currently `0.94`, while capping at viewport width on small screens.
- JavaScript only marks the slider `is-ready` after measuring a non-zero visible image/frame rect.
- Previous/next zones are calculated from the visible `.home-slide-link` image bounds, not the larger slideshow container.
- Empty space around the slideshow image is intentionally not a link target and keeps the normal cursor.
- Arrow keys also move the slideshow.
- Horizontal pointer swipes move slides on touch devices while preserving normal vertical page scrolling.
- Autoplay runs at 2800ms and does not slow down on hover.

When changing the slideshow, verify:

- Direct homepage loads show one current slide immediately, without a partial multi-slide arrangement.
- The image remains centered, contained, proportionally sized, and rounded.
- Rounded corners are visible.
- Empty space above or beside the image is not clickable and does not show a pointer cursor.
- Previous/next hit zones stay aligned to the measured image bounds.
- Mobile still uses a single-column header and a 50vh slideshow area.
- Mobile slideshow images stay within the viewport without horizontal overflow.
- Swipe gestures do not trigger accidental link clicks unless the horizontal drag threshold is crossed.

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

Nav labels use `.nav-stable-link` plus `data-nav-label` to reserve the bold active-label width. This keeps desktop side-nav arrows and neighboring mobile quick links from moving when the active page becomes heavier.

The skip-to-content link was removed intentionally because it appeared visually during normal browsing. Keep `main#main` in place for landmarks and page swaps.

The project hover preview uses a generated, cropped WebP preview URL from `getImage()` to keep the preview lightweight. If `preview.gif` exists in a project folder, that GIF is used in the nav preview instead.

## Project Index

The project index is server-rendered and then hydrated by `src/scripts/site.ts`.

Implementation notes:

- A small head boot script reads URL/session state and sets initial project index view/size attributes before first paint.
- CSS mirrors those attributes so the selected view and size are applied before JavaScript hydration finishes.
- Hydrated controls remain the source of truth after load and after app-style navigation swaps.
- Mobile grid sizes are fixed as `S = 4`, `M = 3`, and `L = 2` columns.
- Mobile list view uses larger images than desktop list view.
- Mobile list size `S` hides summary text.
- Mobile list sizes `M` and `L` let summaries fill remaining text-column height, so larger frames naturally show more text.
- Tags are kept to one compact visual line on mobile.

When changing project index controls, verify there is no visible size/view flicker on direct `/projects/` loads or when navigating back to `/projects/` through app-style navigation.

## Lightbox

The lightbox is defined in `src/layouts/BaseLayout.astro`.

Any anchor with `data-lightbox-item` participates in the lightbox. Items are sorted by `data-lightbox-index`.

The rendered image in the page can be optimized by Astro, but the anchor `href` should point to the original image URL so the lightbox can open the full image.

Implementation notes:

- Opening starts immediately from the clicked thumbnail/current image rect.
- The clicked thumbnail is used as the first visible placeholder while the full image decodes in the background.
- The lightbox frame gets image-specific aspect-ratio CSS variables before the full image swaps in, so fullscreen photos do not grow or snap after loading.
- When the full image is ready, it swaps into the same frame.
- Closing animates back to the triggering image rect and fades the backdrop before hiding the lightbox.
- Escape closes without restoring a visible blue focus ring.
- Horizontal swipes move between lightbox items when multiple images are available.

## Footer

The footer is in `src/layouts/BaseLayout.astro`.

The displayed update date comes from `site.updated` in `src/data/site.ts`. Update this when shipping visible content or design changes.

## Styling Conventions

- Keep shared tokens in `:root` at the top of `src/styles/global.css`.
- Desktop defaults come first; mobile overrides live in the `@media (max-width: 760px)` block.
- Avoid changing global `img` rules to fix one page. Prefer page-specific classes such as `.home-slide-frame` or `.project-card-thumb`.
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
- Homepage slideshow images are centered, contained, rounded, and proportionally sized.
- Direct homepage loads do not snap from a partial arrangement.
- Homepage slideshow speed does not change on hover.
- Empty homepage slideshow space is not clickable.
- Homepage slideshow and lightbox respond to horizontal swipes on touch devices.
- Project cards do not crop thumbnails unexpectedly.
- Project index direct load does not flicker between view or size states.
- Mobile grid sizes render as S = 4, M = 3, and L = 2 columns.
- Mobile list size S hides summaries, while M and L show adaptive summaries.
- Photo grid images load with correct aspect ratios.
- Photos opened in the fullscreen lightbox keep a stable size while loading and moving between images.
- Desktop nav previews are consistently cropped 3:2 with no black bars.
- Desktop and mobile nav labels do not shift when active text gets heavier.
- Lightbox Escape followed by Space/Tab does not show a blue focus ring.
- Footer date is accurate.
- No console errors or framework overlays.
