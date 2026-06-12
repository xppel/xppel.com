# Maintenance Guide

This guide documents the current Astro site structure and the conventions to follow when making updates.

## Architecture

The site is a static Astro project. Most pages are generated from content collections, with shared chrome and scripts kept in Astro components and layout files.

- `src/layouts/BaseLayout.astro` wraps every page, sets metadata, renders the footer, and owns the site-wide lightbox.
- `src/components/SiteChrome.astro` renders desktop navigation, mobile navigation, the floating logo, and project hover previews.
- `src/components/Icon.astro` centralizes inline icon rendering.
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

Photos are columnized by `src/data/photos.ts` and rendered through Astro image optimization.

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
- Nav hover previews: generated with `getImage()` in `src/components/SiteChrome.astro`

Lightbox links intentionally point at the original image asset URL (`image.src`) so users can open the full image, while the displayed thumbnail/page image is optimized by Astro.

Use `public/` for files that should not be transformed, such as:

- PDFs
- favicons
- static files that need a stable public path

## Homepage Slideshow

The homepage slideshow lives in `src/pages/index.astro`, with layout styles in `src/styles/global.css`.

Implementation notes:

- The slideshow list is built from projects where `home.show` is true.
- Slides are ordered by `projectId`, highest first.
- A cloned first slide is appended to support forward looping.
- Each slide wraps the optimized image in `.home-slide-frame`; the frame owns rounded corners and clipping.
- JavaScript measures the `.home-slider` width and moves the track with pixel-based `translate3d(...)`.
- The pixel-based transform avoids percentage rounding drift and keeps slide endpoints exact.
- The transition is defined on `.home-track`.
- Previous/next zones are invisible full-height buttons over the left and right sides.
- Arrow keys also move the slideshow.

When changing the slideshow, verify:

- The image remains centered and contained in `.home-slide-frame`.
- Rounded corners are visible.
- The transform endpoint equals `-(currentSlide * sliderWidth)`.
- The clone reset is not visible at the end of the loop.
- Mobile still uses a single-column header and a 50vh slideshow area.

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

The project hover preview uses a generated WebP preview URL from `getImage()` to keep the preview lightweight.
If `preview.gif` exists in a project folder, that GIF is used in the nav preview instead.

## Lightbox

The lightbox is defined in `src/layouts/BaseLayout.astro`.

Any anchor with `data-lightbox-item` participates in the lightbox. Items are sorted by `data-lightbox-index`.

The rendered image in the page can be optimized by Astro, but the anchor `href` should point to the original image URL so the lightbox can open the full image.

## Footer

The footer is in `src/layouts/BaseLayout.astro`.

The displayed update date comes from `site.updated` in `src/data/site.ts`. Update this when shipping visible content or design changes.

## Styling Conventions

- Keep shared tokens in `:root` at the top of `src/styles/global.css`.
- Desktop defaults come first; mobile overrides live in the `@media (max-width: 760px)` block.
- Avoid changing global `img` rules to fix one page. Prefer page-specific classes such as `.home-slide-frame` or `.project-card-thumb`.
- Keep interactive hit areas stable with explicit dimensions or fixed containers.
- For image surfaces, put border radius and clipping on a stable wrapper when Astro image output or object-fit behavior could vary.

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

Specific visual checks:

- Floating logo fades in after it is positioned.
- Homepage slideshow images are centered, contained, and rounded.
- Slideshow motion lands exactly on slide boundaries.
- Project cards do not crop thumbnails unexpectedly.
- Photo grid images load with correct aspect ratios.
- Footer date is accurate.
- No console errors or framework overlays.
