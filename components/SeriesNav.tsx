import Link from 'next/link'
import type { Post } from '@/lib/content'

type SeriesNavProps = {
  heading: string
  posts: Post[]
  currentSlug: string
  className?: string
}

export function SeriesNav({ heading, posts, currentSlug, className = '' }: SeriesNavProps) {
  if (posts.length < 2) {
    return null
  }

  return (
    <nav
      aria-label={heading}
      className={`rounded-lg border border-ink-800/60 bg-ink-900/30 p-6 ${className}`.trim()}
    >
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-500">
        {heading}
      </h2>
      <ol className="space-y-2.5 text-sm leading-snug">
        {posts.map((post) =>
          post.slug === currentSlug ? (
            <li key={post.slug} className="font-medium text-ink-100" aria-current="true">
              {post.title}
            </li>
          ) : (
            <li key={post.slug}>
              <Link
                href={post.url}
                className="text-ink-300 transition-colors hover:text-accent"
              >
                {post.title}
              </Link>
            </li>
          ),
        )}
      </ol>
    </nav>
  )
}
