# XPPEL.COM

Static Astro portfolio site for Andrew Appel.

## Overview

This repository contains the source for `xppel.com`, a static portfolio built with Astro content collections. Project, photo, and music entries are stored as Markdown content with colocated media assets. The production build is emitted to `dist/` and can be deployed to any static host.

## Requirements

- Node.js 24 recommended for GitHub Actions parity
- Node.js 20 or newer for local development
- npm

## Getting Started

```sh
npm install
npm run dev
```

The dev server will print a local URL, usually `http://localhost:4321/`.

For a clean install in CI or after cloning, use:

```sh
npm ci
```

## Commands

```sh
npm run dev
npm run build
npm run preview
```

- `npm run dev` starts the local development server.
- `npm run build` writes the static production site to `dist/`.
- `npm run preview` serves the production build locally.
- `npm ci` installs exact dependency versions from `package-lock.json`.

## Project Structure

- `src/pages/` contains route-level Astro pages.
- `src/layouts/BaseLayout.astro` contains shared document chrome, metadata, footer, and lightbox behavior.
- `src/components/` contains shared UI pieces such as navigation chrome and icons.
- `src/content/` contains editable project, photo, and music entries.
- `src/content.config.ts` defines content schemas and validates frontmatter.
- `src/data/` contains shared data helpers and site metadata.
- `src/styles/global.css` contains the site-wide layout, typography, responsive rules, and interaction styling.
- `public/assets/` contains static files that should be copied as-is, including PDFs.
- `docs/maintenance.md` explains how the site is organized and how to make common updates safely.

## Content Updates

Project entries live in `src/content/projects/<project>/index.md`.
Photo entries live in `src/content/photos/<photo>/index.md`.
Music entries live in `src/content/music/<track>/index.md`.

Images that are displayed on pages should stay in `src/content/` next to their content entry so Astro can optimize them. Files in `public/` are served unchanged and are best for downloads, favicons, and other assets that should keep a stable public URL.

## Deployment

The site is configured with `site: "https://xppel.com"` in `astro.config.mjs`.
GitHub Pages deployment is handled by `.github/workflows/deploy.yml`.

On GitHub:

1. Open the repository settings.
2. Go to **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Set the custom domain to `xppel.com`.
5. Enable **Enforce HTTPS** once GitHub makes it available.

The `public/CNAME` file also contains `xppel.com`, so the custom domain is included in the built site.

If GitHub shows a **Build with Jekyll** job, Pages is still set to branch publishing. Switch the Pages source to **GitHub Actions** and push `.github/workflows/deploy.yml`.

For the apex domain `xppel.com`, configure these DNS `A` records at the domain provider:

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

For `www.xppel.com`, add a `CNAME` record pointing to `xppel.github.io`.

Run `npm run build` before pushing changes that affect content schemas, image usage, layout code, or routes.

## Git Notes

Do not commit generated or local-only folders such as `node_modules/`, `dist/`, `.astro/`, or the local source/archive folders prefixed with `_`. They are ignored in `.gitignore`.

Commit source files, content entries, optimized-site source assets under `src/content/`, public assets under `public/`, documentation, and lockfiles.
