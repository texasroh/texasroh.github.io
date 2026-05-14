'use client'

import { useEffect, useRef, useState } from 'react'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit',
      })
      return mermaid
    })
  }
  return mermaidPromise
}

let counter = 0

export function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    counter += 1
    const id = `mermaid-${counter}`

    loadMermaid()
      .then((mermaid) => mermaid.render(id, code))
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
        }
      })

    return () => {
      cancelled = true
    }
  }, [code])

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
        ref={ref}
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
