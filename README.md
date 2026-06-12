# XPPEL.COM

Static Astro portfolio site for Andrew Appel.

## Overview

This repository contains the source for `xppel.com`, a static portfolio built with Astro content collections. Project, photo, and music entries are stored as Markdown content with colocated media assets. The production build is emitted to `dist/` and can be deployed to any static host.

## Requirements

- Node.js 20 or newer
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
The build output in `dist/` is static and suitable for GitHub Pages or another static host.

Run `npm run build` before deploying or after changing content schemas, image usage, layout code, or routes.

## Git Notes

Do not commit generated or local-only folders such as `node_modules/`, `dist/`, `.astro/`, or the local source/archive folders prefixed with `_`. They are ignored in `.gitignore`.

Commit source files, content entries, optimized-site source assets under `src/content/`, public assets under `public/`, documentation, and lockfiles.
