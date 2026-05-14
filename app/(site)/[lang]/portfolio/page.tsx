import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPortfolioSource } from '@/lib/content'
import { MdxContent } from '@/components/MdxContent'
import { SiteShell } from '@/components/SiteShell'
import { UI, isLanguage, otherLanguage } from '@/lib/site'

type PageProps = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params

  if (!isLanguage(lang)) {
    return {}
  }

  return {
    title: { absolute: UI[lang].nav.portfolio },
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function PortfolioPage({ params }: PageProps) {
  const { lang } = await params

  if (!isLanguage(lang)) {
    notFound()
  }

  const source = getPortfolioSource()

  return (
    <SiteShell lang={lang} section="portfolio" alternateHref={`/${otherLanguage(lang)}/portfolio/`}>
      <article className="mx-auto max-w-4xl px-6 py-16">
        <MdxContent source={source} className="prose-post" />
      </article>
    </SiteShell>
  )
}
