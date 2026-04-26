import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 · Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6 py-16 text-ink-200">
      <div className="w-full max-w-md text-center">
        <p className="mb-6 font-mono text-7xl font-bold tracking-tight text-accent sm:text-8xl">
          404
        </p>
        <h1 className="mb-3 text-2xl font-semibold text-ink-50">Page not found</h1>
        <p className="mb-1 text-ink-400">요청하신 페이지를 찾을 수 없습니다.</p>
        <p className="mb-10 text-ink-400">The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <Link
            href="/ko/blog/"
            className="rounded-full border border-ink-700/60 bg-ink-800/70 px-4 py-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            한국어 블로그
          </Link>
          <Link
            href="/en/blog/"
            className="rounded-full border border-ink-700/60 bg-ink-800/70 px-4 py-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            English blog
          </Link>
        </div>
      </div>
    </main>
  )
}
