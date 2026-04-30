---
title: "From Blogger to Next.js: A Blog Platform Decision"
date: 2026-04-27
lang: en
tags: [nextjs, jekyll, blog]
description: "How I left Google Blogger, briefly tried Jekyll, and settled on Next.js static export."
---

When I decided to start blogging again, I opened my old Google Blogger. The posts I'd scribbled there as an undergrad were still around, but the tone, content, and design were all artifacts of that moment in time and didn't fit who I am now. **I decided not to migrate them.** The old Blogger stays as-is, and I start a new chapter.

This post is about the decision of which platform that new chapter would run on.

## Candidates

The options I weighed initially:

- **Stay on Blogger** — already rejected. Too restrictive for design and feature control, and Blogger itself feels closer to abandoned than maintained
- **Jekyll** — officially supported by GitHub Pages, with standardized markdown-based blog conventions
- **Next.js static export** — familiar React/TS, MDX support, can host as a static site on GitHub Pages
- **Astro** — Jekyll-grade performance with the option of mixing in React components. Attractive, but a new tool to learn

## First attempt: Jekyll (left within days)

I started with Jekyll. The conventions are standardized, so I could spin it up fast — but a few sources of friction piled up within days:

- **Liquid template limits** — debugging gets painful when collections and filtering get even slightly complex. Especially when JSX/TS is already second nature
- **Ruby/Bundler environment** — outside of work I don't really touch anything besides Node. One more toolchain to maintain felt grating

It only took a few days to decide: **this won't work.**

## Where I landed: Next.js static export

I picked Next.js next. The reasoning:

- **Type safety** — content loader, i18n dictionary, and data schemas all managed in TS. Mistakes like duplicate slugs get caught at build time
- **MDX** — React components can sit directly inside a post. Building a custom `Callout` box and using it inline feels natural
- **Consistent dev environment** — done with the same Node tooling I use everywhere else
- **GitHub Pages just hosts static files** — `output: 'export'` produces an `out/` directory that GitHub Actions uploads. No server

Astro was tempting too, but the cost of learning one more tool didn't seem to buy enough differentiation. **Go with the weapon you already know** — that was the conclusion.

## Site structure

```
app/
  (site)/[lang]/
    blog/
      page.tsx              # post list
      [slug]/page.tsx       # post detail
components/                  # shared UI
lib/                         # content loader, i18n
_posts/{ko,en}/             # blog posts (Markdown / MDX)
public/assets/              # static assets
```

Posts live as plain markdown. Writing and editing happen in the editor; builds and deploys are automated.

## URL policy

Blog URLs use the slug only.

```
/en/blog/from-blogger-to-nextjs/
```

No year, month, or day. **Within a single language, duplicate slugs make the build fail** — so two posts can never silently fight over the same URL.

## Multilingual policy

Two trees: `/ko/...` and `/en/...`. Each post matches across languages by sharing the same slug. The header language toggle finds the matching slug and jumps to it; if there's no translation, it falls back to the blog index in the target language.

Translation isn't mandatory. I write each post in **whichever language fits the topic**, and only produce an English version when the content is likely to reach a global audience. Korean is the default; English is selective.

## Going forward

The old Blogger posts won't be brought over. The kinds of posts I want to write in this new chapter:

- **Decision retrospectives** — why X over Y
- **Incidents and debugging** — bugs caught in production
- **Applied learnings** — not "I tried X" but "how X actually fit into the context"

Slow pace over fast pace. The first post a visitor lands on becomes the impression of the whole blog.
