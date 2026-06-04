import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostsByLanguage } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { SiteShell } from '@/components/SiteShell'
// View count display is temporarily off (see ViewCount.tsx). The list only
// showed the number and triggered an unused Firestore read, so it's disabled
// here. Tracking still runs on post pages.
// import { ViewCount, ViewCountsProvider } from '@/components/ViewCount'
import { UI, absoluteUrl, isLanguage, otherLanguage } from '@/lib/site'

type PageProps = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params

  if (!isLanguage(lang)) {
    return {}
  }

  const t = UI[lang]

  return {
    title: t.blog.title,
    description: t.blog.description,
    alternates: {
      canonical: absoluteUrl(`/${lang}/blog/`),
      languages: {
        [otherLanguage(lang)]: absoluteUrl(`/${otherLanguage(lang)}/blog/`),
      },
    },
    openGraph: {
      title: t.blog.title,
      description: t.blog.description,
      url: absoluteUrl(`/${lang}/blog/`),
      type: 'website',
    },
  }
}

export default async function BlogPage({ params }: PageProps) {
  const { lang } = await params

  if (!isLanguage(lang)) {
    notFound()
  }

  const posts = getPostsByLanguage(lang)
  const t = UI[lang]

  return (
    <SiteShell lang={lang} section="blog" alternateHref={`/${otherLanguage(lang)}/blog/`}>
      <article className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-14">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-ink-50 sm:text-6xl">
            {t.blog.title}
          </h1>
          <p className="text-lg text-ink-400">{t.blog.description}</p>
        </header>

        {posts.length === 0 ? (
          <p className="py-20 text-center text-ink-500">{t.blog.noPosts}</p>
        ) : (
          <div className="space-y-10">
            {posts.map((post) => (
              <article key={post.id} className="group">
                <Link href={post.url} className="block no-underline">
                  <div className="mb-2 flex flex-wrap items-baseline gap-4 text-sm text-ink-500">
                    <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
                    {post.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag) => (
                          <span key={tag} className="text-accent">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {/* <ViewCount slug={post.slug} label={t.blog.views} /> */}
                  </div>
                  <h2 className="mb-2 text-2xl font-bold tracking-tight text-ink-50 transition-colors group-hover:text-accent sm:text-3xl">
                    {post.title}
                  </h2>
                  <p className="leading-relaxed text-ink-300">{post.excerpt}</p>
                </Link>
              </article>
            ))}
          </div>
        )}
      </article>
    </SiteShell>
  )
}
