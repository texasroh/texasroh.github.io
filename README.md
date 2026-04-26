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
