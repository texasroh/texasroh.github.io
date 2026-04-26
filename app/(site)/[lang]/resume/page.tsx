import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getResumeContent } from '@/lib/content'
import { ResumePage } from '@/components/resume/ResumePage'
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
    title: UI[lang].nav.resume,
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

  const resume = getResumeContent(lang)

  return (
    <SiteShell lang={lang} section="resume" alternateHref={`/${otherLanguage(lang)}/resume/`}>
      <ResumePage lang={lang} resume={resume} />
    </SiteShell>
  )
}
