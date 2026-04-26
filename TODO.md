# TODO

Future enhancements, in rough priority order.

## Blog features

- [ ] **Comments** — integrate [Giscus](https://giscus.app) (GitHub Discussions-backed, no ads, free)
- [ ] **View counter** — per-post hit counter (options: Firebase Firestore, Supabase, GoatCounter)
- [ ] **Site-wide analytics** — Cloudflare Web Analytics (privacy-friendly) or Google Analytics
- [ ] **RSS feed polish** — per-language feeds (`/ko/feed.xml`, `/en/feed.xml`)
- [ ] **Tag / category pages** — `/ko/blog/tags/:tag/` listings
- [ ] **Related posts** — show 3 related posts at end of each article
- [ ] **Search** — client-side search via Lunr.js or Pagefind
- [ ] **Table of contents** — sticky TOC on long posts
- [ ] **Code block copy button** — click to copy code samples
- [ ] **Reading progress bar** — top of page progress indicator

## Design / UX

- [ ] **Dark mode** — system preference + manual toggle, persisted in localStorage
- [ ] **Post cover images** — optional hero image per post
- [ ] **Author card** — small author bio at bottom of each post
- [ ] **Open Graph image auto-generation** — generate social share images per post

## Resume

- [ ] **PDF export** — auto-generate downloadable resume PDF from markdown
- [ ] **Print stylesheet** — clean print layout

## Infra

- [ ] **Image optimization** — compress assets and add responsive `srcset` where useful
- [ ] **Preview deployments** — PR preview via Netlify or Cloudflare Pages
- [ ] **Broken link checker** — scheduled GitHub Action
- [ ] **Lighthouse CI** — performance regression check on PRs

## Content

- [ ] Write 5 initial blog posts covering recent projects
- [ ] Add more project screenshots to resume hero section
