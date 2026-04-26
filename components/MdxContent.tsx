import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'

function Callout({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <aside className="my-6 border-l-4 border-accent bg-ink-950/50 px-5 py-4 text-ink-200">
      {title ? <p className="mb-2 font-semibold text-ink-50">{title}</p> : null}
      <div>{children}</div>
    </aside>
  )
}

function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const href = props.href ?? ''
  const isExternal = href.startsWith('http://') || href.startsWith('https://')

  return (
    <a
      {...props}
      target={isExternal ? '_blank' : props.target}
      rel={isExternal ? 'noreferrer' : props.rel}
    />
  )
}

const components = {
  a: Link,
  Callout,
  Note: Callout,
}

export async function MdxContent({
  source,
  className,
}: {
  source: string
  className?: string
}) {
  if (!source.trim()) {
    return null
  }

  return (
    <div className={className}>
      <MDXRemote
        source={source}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  )
}

export function StoreBadge({
  href,
  children,
  icon,
}: {
  href: string
  children: ReactNode
  icon: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700/60 bg-ink-800/70 px-2.5 py-1 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
    >
      <span className="h-3.5 w-3.5">{icon}</span>
      {children}
    </a>
  )
}

export function IconSvg(props: HTMLAttributes<SVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" {...props} />
}
