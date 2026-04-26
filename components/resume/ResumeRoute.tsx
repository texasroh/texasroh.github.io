'use client'

import { useEffect, useState } from 'react'
import type { Language } from '@/lib/site'
import { otherLanguage } from '@/lib/site'
import { SiteShell } from '@/components/SiteShell'
import { ResumePageClient } from './ResumePageClient'

export function ResumeRoute({ lang }: { lang: Language }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SiteShell lang={lang} section="resume" alternateHref={`/${otherLanguage(lang)}/resume/`}>
      <ResumePageClient lang={lang} />
    </SiteShell>
  )
}
