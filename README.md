# texasroh.github.io

## Firebase view counter setup

This site can show:

- total site views
- total unique visitors
- per-post views
- per-post unique visitors

### 1. Create a Firebase project

Create a Firebase project and enable Firestore in production mode.

### 2. Add environment variables

Copy `.env.example` to `.env.local` and fill in the Firebase web app values.

### 3. Firestore document structure

The app writes to the `view_stats` collection.

- `view_stats/site-totals`
  - `totalViews`
  - `uniqueVisitors`
  - `updatedAt`
- `view_stats/{encodeURIComponent(postPath)}`
  - `path`
  - `title`
  - `lang`
  - `views`
  - `uniqueVisitors`
  - `updatedAt`

### 4. Recommended Firestore rules for initial rollout

This is a lightweight first version, so writes come from the client. Keep rules narrow and review abuse risk before production scale.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /view_stats/{docId} {
      allow read: if true;
      allow create, update: if true;
      allow delete: if false;
    }
  }
}
```

### 5. Counting behavior

- every page load increments view count
- unique visitor count increments once per browser per page every 24 hours
- site totals increment alongside page totals

### 6. Hardening idea for later

If abuse becomes a concern, move write operations behind Cloud Functions or a small edge endpoint and keep Firestore read-only from the client.

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
