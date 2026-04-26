import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ResumeRoute } from '@/components/resume/ResumeRoute'
import { UI, isLanguage } from '@/lib/site'

type PageProps = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params

  if (!isLanguage(lang)) {
    return {}
  }

  return {
    title: { absolute: UI[lang].nav.resume },
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function ResumeRoutePage({ params }: PageProps) {
  const { lang } = await params

  if (!isLanguage(lang)) {
    notFound()
  }

  return <ResumeRoute lang={lang} />
}
