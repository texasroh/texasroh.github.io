'use client'

import { useEffect, useState } from 'react'
import type { Language } from '@/lib/site'
import type { RenderedResumeContent } from '@/lib/content'
import { ResumePage } from './ResumePage'

export function ResumePageClient({ lang }: { lang: Language }) {
  const [resume, setResume] = useState<RenderedResumeContent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/data/resume-${lang}.json`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = (await res.json()) as RenderedResumeContent
        if (!cancelled) {
          setResume(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [lang])

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-32 text-center text-ink-400">
        <p>Failed to load resume ({error}).</p>
      </div>
    )
  }

  if (!resume) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-32" aria-busy="true">
        <div className="mx-auto h-48 w-48 animate-pulse rounded-2xl bg-ink-800/60 sm:h-56 sm:w-56" />
        <div className="mx-auto mt-8 h-4 w-32 animate-pulse rounded bg-ink-800/60" />
        <div className="mx-auto mt-3 h-8 w-64 animate-pulse rounded bg-ink-800/60" />
      </div>
    )
  }

  return <ResumePage lang={lang} resume={resume} />
}
