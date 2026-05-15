'use client'

import { useEffect, useId, useState } from 'react'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        themeVariables: {
          darkMode: true,
          background: '#18181b',
          primaryColor: '#27272a',
          primaryTextColor: '#f4f4f5',
          primaryBorderColor: '#52525b',
          secondaryColor: '#1f1f23',
          secondaryTextColor: '#e4e4e7',
          secondaryBorderColor: '#3f3f46',
          tertiaryColor: '#27272a',
          tertiaryTextColor: '#e4e4e7',
          tertiaryBorderColor: '#3f3f46',
          lineColor: '#a1a1aa',
          textColor: '#e4e4e7',
          mainBkg: '#27272a',
          clusterBkg: '#1f1f23',
          clusterBorder: '#3f3f46',
          edgeLabelBackground: '#27272a',
          labelTextColor: '#e4e4e7',
          nodeBorder: '#52525b',
        },
      })
      return mermaid
    })
  }
  return mermaidPromise
}

export function Mermaid({ code }: { code: string }) {
  const reactId = useId().replace(/:/g, '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-${reactId}`

    loadMermaid()
      .then((mermaid) => mermaid.render(id, code))
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          console.error('[Mermaid] render failed:', message, { code })
          setError(message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [code, reactId])

  if (error) {
    return (
      <pre className="overflow-x-auto rounded-md bg-ink-900 p-4 text-xs text-red-400">
        {`Mermaid render failed: ${error}\n\n${code}`}
      </pre>
    )
  }

  if (!svg) {
    return (
      <div
        className="my-4 flex h-32 items-center justify-center rounded-md bg-ink-900/40 text-sm text-ink-500"
        aria-busy="true"
      >
        Loading diagram…
      </div>
    )
  }

  return (
    <div
      className="mermaid-diagram my-6 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
