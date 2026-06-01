# texasroh.github.io

Personal site — resume + blog, built with Next.js static export and deployed to GitHub Pages.

- **Blog**: `/ko/blog/`, `/en/blog/` (indexed)
- **Resume**: `/ko/resume/`, `/en/resume/` (noindex)
- **Content**: Markdown/MDX files in `_posts/` and `_resume/`

## Local Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/ko/blog/` or `http://localhost:3000/en/blog/`.

## Production Build

```bash
npm run build
```

The static GitHub Pages artifact is generated in `out/`.

## Writing A Blog Post

Create files at `_posts/ko/YYYY-MM-DD-slug.md` or `_posts/en/YYYY-MM-DD-slug.mdx`:

```markdown
---
title: "글 제목"
date: 2026-04-19
lang: ko
tags: [nextjs, blog]
description: "한 줄 요약"
---

본문 내용...
```

Generated URL:

```text
/ko/blog/YYYY/MM/DD/slug/
```

MDX files can use registered components such as:

```mdx
<Callout title="Note">
MDX content can include React-backed components.
</Callout>
```

## Editing The Resume

Each resume section/item lives as its own Markdown or MDX file:

- `_resume/ko/` — Korean resume
- `_resume/en/` — English resume

Frontmatter carries structured metadata, and the body carries prose/bullets.

Example:

```markdown
---
section: experience
order: 10
company: "AvoMD"
role: "Full-Stack Developer"
period_start: "2023.08"
period_end: "현재"
description: "..."
tech_stack: [Django, React, AWS]
---

- Bullet point 1
- Bullet point 2
```

## Post View Counter

Each post tracks views via a Firebase Firestore document (`views/{slug}`, shared
across the ko/en translations). It runs entirely client-side on the free Spark
plan — no billing account required.

One-time setup:

1. Create a Firebase project and enable **Firestore Database** (production mode).
2. Firestore -> **Rules**: paste the contents of [`firestore.rules`](firestore.rules)
   and publish. They allow reading counts and incrementing by exactly 1 — nothing else.
3. Project settings -> **Your apps** -> register a Web app, copy the config.
4. Local dev: `cp .env.local.example .env.local` and fill in the four
   `NEXT_PUBLIC_FIREBASE_*` values.
5. CI: add the same four as repo **Variables** (Settings -> Secrets and variables
   -> Actions -> Variables). They are public values, not secrets.

The first visit to a post (per browser session) increments the count. The counter
is **disabled in development** (`next dev`) and when the env vars are missing, so
local browsing never inflates production counts and the site still builds
unconfigured. It runs only in the production build.

## Analytics (GA4)

Page analytics run through Firebase Analytics on the same project, initialized
client-side in [`components/Analytics.tsx`](components/Analytics.tsx). To enable:

1. Firebase console -> Project settings -> **Integrations** -> enable **Google Analytics**
   (creates a linked GA4 property).
2. Project settings -> **Your apps** -> the web app config now includes a
   `measurementId` (`G-XXXXXXX`).
3. Add it as `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` in `.env.local` and as a repo
   Variable for CI.

It stays off until that id is set, and (like the counter) is disabled in
development so local runs don't pollute Analytics. GA4 enhanced measurement
(on by default) tracks client-side route changes, so no per-page wiring is needed.

## Structure

```text
app/                         # Next.js App Router pages
components/                  # Shared UI and resume sections
lib/                         # Markdown/MDX content loader
public/assets/images/        # Static images served at /assets/images/*
_posts/{ko,en}/              # Blog posts
_resume/{ko,en}/             # Resume content
.github/workflows/deploy.yml # GitHub Pages deploy
```

GitHub Actions runs `npm ci`, `npm run build`, and deploys `out/` to Pages.
