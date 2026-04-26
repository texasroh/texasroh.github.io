import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LANGUAGES, SITE_URL, UI, isLanguage } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params

  if (!isLanguage(lang)) {
    return {}
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: UI[lang].site.title,
      template: `%s · ${UI[lang].site.title}`,
    },
    description: UI[lang].site.description,
    icons: {
      icon: '/assets/images/favicon.ico',
    },
  }
}

export default async function LanguageLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!isLanguage(lang)) {
    notFound()
  }

  return <>{children}</>
}
