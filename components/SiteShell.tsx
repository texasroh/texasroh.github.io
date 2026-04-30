import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Language, Section } from '@/lib/site'
import { AUTHOR, UI, otherLanguage } from '@/lib/site'

type SiteShellProps = {
  lang: Language
  section?: Section
  alternateHref?: string
  noTranslation?: boolean
  children: ReactNode
}

export function SiteShell({
  lang,
  section,
  alternateHref,
  noTranslation = false,
  children,
}: SiteShellProps) {
  const t = UI[lang]
  const other = otherLanguage(lang)
  const languageHref = alternateHref ?? `/${other}/blog/`

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink-800/60 bg-ink-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href={`/${lang}/blog/`}
            className="text-ink-50 transition-colors hover:text-accent"
            aria-label={t.site.title}
          >
            <SiteLogo />
          </Link>

          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            {section === 'resume' ? (
              <>
                <NavLink href={`/${lang}/blog/`} active={false}>
                  {t.nav.blog}
                </NavLink>
                <span className="mx-2 h-5 w-px bg-ink-800" />
              </>
            ) : null}
            {/* TODO: re-enable resume nav link later
            <NavLink href={`/${lang}/resume/`} active={section === 'resume'}>
              {t.nav.resume}
            </NavLink>
            */}
            <Link
              href={languageHref}
              title={noTranslation ? t.nav.languageNoTranslation : undefined}
              className={`rounded-full px-3 py-1.5 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-50 ${
                noTranslation ? 'opacity-70' : ''
              }`}
            >
              {t.nav.languageToggle}
              {noTranslation ? (
                <span className="ml-1 text-xs" aria-hidden="true">
                  ↗
                </span>
              ) : null}
            </Link>
          </nav>
        </div>
      </header>

      <main className="min-h-[calc(100vh-180px)]">{children}</main>

      <footer className="mt-24 border-t border-ink-800/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-ink-500 sm:flex-row">
          <div className="flex items-center gap-5">
            <a
              href={`https://github.com/${AUTHOR.github}`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink-50"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.08 1.84 1.23 1.84 1.23 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.14 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/in/${AUTHOR.linkedin}/`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink-50"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
              </svg>
            </a>
          </div>
          <span>{t.footer.copyright}</span>
        </div>
      </footer>
    </>
  )
}

function SiteLogo() {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className="h-9 w-9 fill-current"
      role="img"
      aria-hidden="true"
    >
      {/* main pad */}
      <ellipse cx="16" cy="22" rx="7" ry="6" />
      {/* outer-left toe */}
      <ellipse cx="6" cy="13.5" rx="2.8" ry="3.8" transform="rotate(-25 6 13.5)" />
      {/* inner-left toe */}
      <ellipse cx="12" cy="8" rx="2.5" ry="3.7" transform="rotate(-10 12 8)" />
      {/* inner-right toe */}
      <ellipse cx="20" cy="8" rx="2.5" ry="3.7" transform="rotate(10 20 8)" />
      {/* outer-right toe */}
      <ellipse cx="26" cy="13.5" rx="2.8" ry="3.8" transform="rotate(25 26 13.5)" />
    </svg>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 transition-colors ${
        active ? 'bg-ink-50 text-ink-900' : 'text-ink-400 hover:bg-ink-800 hover:text-ink-50'
      }`}
    >
      {children}
    </Link>
  )
}
