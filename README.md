# syn.fun

Minimal Astro prototype for a GitHub-backed community library around synesthesia coding.

## What this is

- Static Astro site.
- Content lives in MDX files.
- People contribute through pull requests.
- Search-first UI with row-based lists and a featured feed on the home page.
- Every entry keeps attribution visible: who submitted it, who authored it, where it came from, and what license applies.

## Routes

- `/`: home feed with featured entries and recent submissions.
- `/browse`: search and facet view.
- `/functions`: function-only list.
- `/snippets`: snippet-only list.
- `/write-ups`: write-up index.
- `/e/[slug]`: entry detail page.

## Content model

All content lives in a single collection under `src/content/entries` with a `type` discriminator. This leverages Astro 6's native `globe` loader API inside `src/content.config.ts`.
Note: The boilerplate seed content currently includes `{/* PLACEHOLDER_CONTENT */}` markers that should be removed or completely replaced prior to launch.

Each MDX entry should include frontmatter like this:

```md
---
title: myFunction
type: function
lang: glsl
summary: One-line explanation.
excerpt:
tags: []
submittedBy: your-handle
originalAuthor:
source:
license: Unlicensed
example:
date: 2026-05-28
featured: false
cover:
---
```

## Entry types

- `function`: singular reusable helpers.
- `snippet`: multi-part code drops, mixed-language examples, or small recipes.
- `write-up`: guides, tutorials, and tips.

## Contribution flow

- The top-bar submit button opens GitHub's new-file editor with a prefilled MDX template.
- Entry detail pages link directly to the matching GitHub edit URL.
- Attribution is surfaced in the UI through submitted by, author, source, and license fields.

## Run locally

```bash
npm install
npm run dev
```

## Deployment notes

- Set `SITE_URL` in Coolify so Astro knows the final site URL.
- Set `PUBLIC_REPO_URL` so the submit button points at the actual GitHub repo.
- Optionally set `PUBLIC_REPO_BRANCH` if you do not use `main`.
- Build command: `npm run build`
- Publish directory: `dist`

## Current priorities

- Keep the code short and easy to rework.
- Keep the single-entry content model stable for pull requests.
- Keep room open for a later Pagefind integration and richer moderation workflow.