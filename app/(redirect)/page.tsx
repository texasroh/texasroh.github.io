import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Junhyeok Roh',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6 text-center text-ink-300">
      <div>
        <script
          dangerouslySetInnerHTML={{
            __html: 'window.location.replace("/ko/blog/");',
          }}
        />
        <h1 className="mb-4 text-2xl font-semibold text-ink-50">Redirecting...</h1>
        <p>
          <a href="/ko/blog/" className="text-accent underline underline-offset-4">
            한국어
          </a>
          <span className="mx-2 text-ink-600">·</span>
          <a href="/en/blog/" className="text-accent underline underline-offset-4">
            English
          </a>
        </p>
      </div>
    </main>
  )
}
