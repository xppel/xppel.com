# XPPEL.COM

Portfolio website for Andrew Appel: design, engineering, creative technology, photography, and music.

The site is built with [Astro](https://astro.build/) and published at [xppel.com](https://xppel.com). It is a static site with project, photo, and music content managed through local Markdown entries and colocated media assets.

## Highlights

- Project index with search, filters, responsive grid/list views, and year-based navigation.
- Project pages with optimized images and support for image, GIF, video, and YouTube media.
- Homepage slideshow of selected work.
- Photo grid with optimized Astro images.
- Custom audio players for music.
- GitHub Pages deployment through GitHub Actions.

## Tech Stack

- Astro
- TypeScript-flavored Astro components
- Astro content collections
- Astro image optimization
- GitHub Pages and GitHub Actions

## Local Development

```sh
npm install
npm run dev
```

The dev server usually runs at `http://localhost:4321/`.

Useful commands:

```sh
npm run dev
npm run build
npm run preview
npm ci
```

`npm run build` should pass before pushing layout, schema, media, or route changes.

## Project Structure

- `src/pages/` contains the site routes.
- `src/components/` contains shared UI components.
- `src/layouts/BaseLayout.astro` contains shared page chrome, metadata, footer, and lightbox behavior.
- `src/content/` contains project, photo, and music entries.
- `src/content.config.ts` validates content collection frontmatter.
- `src/data/` contains shared site data and collection helpers.
- `src/styles/global.css` contains the main visual system and responsive rules.
- `public/` contains static files copied through unchanged, including PDFs, `CNAME`, and `.nojekyll`.
- `docs/maintenance.md` documents content conventions and common maintenance tasks.

## Content

Projects live in `src/content/projects/<project>/index.md`.

Photos live in `src/content/photos/<photo>/index.md`.

Music tracks live in `src/content/music/<track>/index.md`.

Images that are rendered on the site should generally live beside their content entry in `src/content/` so Astro can optimize and validate them. Files that need stable public URLs, such as PDFs or favicons, belong in `public/`.

## Deployment

The site deploys to GitHub Pages through `.github/workflows/deploy.yml`.

Repository Pages settings should use:

- **Source:** GitHub Actions
- **Custom domain:** `xppel.com`
- **HTTPS:** enforced when available

If GitHub shows a **Build with Jekyll** job, Pages is still set to branch publishing. Switch the Pages source to **GitHub Actions** so Astro builds and deploys the site.

For the apex domain, GitHub Pages expects these `A` records:

```txt
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Optional IPv6 `AAAA` records:

```txt
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

For `www.xppel.com`, use a `CNAME` record pointing to `xppel.github.io`.

## Repository Notes

Generated and local-only folders are ignored, including `node_modules/`, `dist/`, `.astro/`, and local archive folders beginning with `_`.

Commit source files, content entries, public assets, documentation, and lockfiles.
