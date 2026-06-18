import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug, getPostTranslation, getSeriesPosts } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { MdxContent } from '@/components/MdxContent'
import { SeriesNav } from '@/components/SeriesNav'
import { SiteShell } from '@/components/SiteShell'
import { ViewCount } from '@/components/ViewCount'
import { UI, absoluteUrl, isLanguage, otherLanguage } from '@/lib/site'

type PageProps = {
  params: Promise<{
    lang: string
    slug: string
  }>
}

export function generateStaticParams() {
  return getAllPosts().map((post) => ({
    lang: post.lang,
    slug: post.slug,
  }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params

  if (!isLanguage(resolved.lang)) {
    return {}
  }

  const post = getPostBySlug({
    lang: resolved.lang,
    slug: resolved.slug,
  })

  if (!post) {
    return {}
  }

  const other = otherLanguage(post.lang)
  const translation = getPostTranslation(post, other)

  return {
    title: post.title,
    description: post.description ?? post.excerpt,
    alternates: {
      canonical: absoluteUrl(post.url),
      languages: translation
        ? {
            [other]: absoluteUrl(translation.url),
          }
        : undefined,
    },
    openGraph: {
      title: post.title,
      description: post.description ?? post.excerpt,
      url: absoluteUrl(post.url),
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
    },
  }
}

export default async function PostPage({ params }: PageProps) {
  const resolved = await params

  if (!isLanguage(resolved.lang)) {
    notFound()
  }

  const post = getPostBySlug({
    lang: resolved.lang,
    slug: resolved.slug,
  })

  if (!post) {
    notFound()
  }

  const t = UI[post.lang]
  const other = otherLanguage(post.lang)
  const translation = getPostTranslation(post, other)
  const seriesPosts = post.series ? getSeriesPosts(post.series, post.lang) : []

  return (
    <SiteShell
      lang={post.lang}
      section="blog"
      alternateHref={translation?.url ?? `/${other}/blog/`}
      noTranslation={!translation}
    >
      <article className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/${post.lang}/blog/`}
          className="mb-8 inline-block text-sm text-ink-400 transition-colors hover:text-accent"
        >
          {t.blog.backToList}
        </Link>

        <header className="mb-10 border-b border-ink-800/60 pb-8">
          <div className="mb-3 flex items-baseline gap-4 text-sm text-ink-500">
            <time dateTime={post.date}>{formatDate(post.date, post.lang)}</time>
            <span>
              · {post.readingMinutes} {t.blog.readingTime}
            </span>
            <ViewCount slug={post.slug} label={t.blog.views} track className="before:content-['·_']" />
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-[1.15] tracking-tight text-ink-50 sm:text-5xl">
            {post.title}
          </h1>
          {post.description ? (
            <p className="text-lg leading-relaxed text-ink-300">{post.description}</p>
          ) : null}
          {post.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <SeriesNav
          heading={t.blog.series}
          posts={seriesPosts}
          currentSlug={post.slug}
          className="mb-12"
        />

        <MdxContent source={post.content} className="prose-post" />

        <SeriesNav
          heading={t.blog.series}
          posts={seriesPosts}
          currentSlug={post.slug}
          className="mt-16"
        />
      </article>
    </SiteShell>
  )
}
