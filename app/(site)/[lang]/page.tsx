import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLanguage } from '@/lib/site'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
  },
}

export default async function LanguageIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!isLanguage(lang)) {
    notFound()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6 text-center text-ink-300">
      <div>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.location.replace("/${lang}/blog/");`,
          }}
        />
        <h1 className="mb-4 text-2xl font-semibold text-ink-50">Redirecting...</h1>
        <p>
          <a href={`/${lang}/blog/`} className="text-accent underline underline-offset-4">
            Blog
          </a>
        </p>
      </div>
    </main>
  )
}
