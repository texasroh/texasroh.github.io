import type { Language } from '@/lib/site'
import { UI } from '@/lib/site'
import type { RenderedResumeContent, RenderedResumeItem } from '@/lib/content'
import { IconSvg, StoreBadge } from '@/components/MdxContent'

export function ResumePage({ lang, resume }: { lang: Language; resume: RenderedResumeContent }) {
  return (
    <article className="mx-auto max-w-5xl px-6">
      <Hero lang={lang} />

      {resume.intro ? <Intro lang={lang} item={resume.intro} /> : null}
      {resume.experiences.length > 0 ? (
        <Experiences lang={lang} items={resume.experiences} />
      ) : null}
      {resume.otherExperiences.length > 0 ? (
        <OtherExperiences lang={lang} items={resume.otherExperiences} />
      ) : null}
      {resume.skills ? <Skills lang={lang} item={resume.skills} /> : null}
      {resume.educations.length > 0 ? <Education lang={lang} items={resume.educations} /> : null}
    </article>
  )
}

function Hero({ lang }: { lang: Language }) {
  const t = UI[lang]

  return (
    <section className="fade-in-up pb-16 pt-20 text-center">
      <div className="mb-8 flex justify-center">
        <div className="grid h-48 w-48 grid-cols-2 gap-1 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-ink-800 sm:h-56 sm:w-56">
          <img src="/assets/images/my_photo.jpg" alt="Junhyeok Roh portrait 1" className="h-full w-full object-cover" />
          <img src="/assets/images/my_photo2.jpg" alt="Junhyeok Roh portrait 2" className="h-full w-full object-cover" />
          <img src="/assets/images/my_photo2.jpg" alt="Junhyeok Roh portrait 3" className="h-full w-full object-cover" />
          <img src="/assets/images/my_photo.jpg" alt="Junhyeok Roh portrait 4" className="h-full w-full object-cover" />
        </div>
      </div>

      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-ink-500">{t.site.tagline}</p>
      <h1 className="mb-2 text-5xl font-bold tracking-tight text-ink-50 sm:text-6xl">
        {t.resume.hero.name}
      </h1>
      <p className="text-lg text-ink-400">{t.resume.hero.role}</p>
    </section>
  )
}

function HtmlBlock({ html, className }: { html: string; className?: string }) {
  if (!html) {
    return null
  }
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

function Intro({ lang, item }: { lang: Language; item: RenderedResumeItem }) {
  return (
    <ResumeSection title={UI[lang].resume.sections.intro}>
      <HtmlBlock html={item.html} className="prose-post text-ink-300" />
    </ResumeSection>
  )
}

function Experiences({ lang, items }: { lang: Language; items: RenderedResumeItem[] }) {
  return (
    <ResumeSection title={UI[lang].resume.sections.experience}>
      <div className="space-y-12">
        {items.map((item) => (
          <article key={item.id} className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
            <div className="text-sm text-ink-400">
              <div className="whitespace-nowrap font-medium text-ink-200">
                {item.period_start} <span className="mx-0.5 text-ink-500">-</span> {item.period_end}
              </div>
              {item.location ? <div className="mt-1 text-xs text-ink-500">{item.location}</div> : null}
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-baseline gap-x-3">
                <h3 className="text-xl font-bold text-ink-50">{item.company}</h3>
                <span className="text-ink-500">·</span>
                <span className="font-medium text-ink-300">{item.role}</span>
              </div>
              {item.description ? (
                <p className="mb-4 text-sm italic text-ink-400">{item.description}</p>
              ) : null}
              <HtmlBlock html={item.html} className="prose-post text-ink-300" />
              <TechStack items={item.tech_stack} className="mt-5" />
            </div>
          </article>
        ))}
      </div>
    </ResumeSection>
  )
}

function OtherExperiences({ lang, items }: { lang: Language; items: RenderedResumeItem[] }) {
  return (
    <ResumeSection title={UI[lang].resume.sections.otherExperience}>
      <div className="space-y-10">
        {items.map((item) => (
          <article key={item.id} className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
            <div className="text-sm font-medium text-ink-400">{item.period}</div>
            <div>
              <h3 className="mb-2 flex flex-wrap items-center gap-2 text-lg font-bold text-ink-50">
                {item.title}
                {item.link ? (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent transition-colors hover:text-ink-50"
                    aria-label={`${item.title} link`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 3h7m0 0v7m0-7L10 14m-4-4v10a2 2 0 002 2h10"
                      />
                    </svg>
                  </a>
                ) : null}
              </h3>

              {item.play_store || item.app_store ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {item.play_store ? (
                    <StoreBadge href={item.play_store} icon={<PlayStoreIcon />}>
                      Play Store
                    </StoreBadge>
                  ) : null}
                  {item.app_store ? (
                    <StoreBadge href={item.app_store} icon={<AppStoreIcon />}>
                      App Store
                    </StoreBadge>
                  ) : null}
                </div>
              ) : null}

              <HtmlBlock html={item.html} className="prose-post text-[0.95rem] text-ink-300" />
              <TechStack items={item.tech_stack} className="mt-4" />
            </div>
          </article>
        ))}
      </div>
    </ResumeSection>
  )
}

function Skills({ lang, item }: { lang: Language; item: RenderedResumeItem }) {
  return (
    <ResumeSection title={UI[lang].resume.sections.skills}>
      <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
        {(item.skills ?? []).map((group) => (
          <div key={group.category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-500">
              {group.category}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-ink-700/60 bg-ink-800/70 px-3 py-1 text-sm text-ink-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ResumeSection>
  )
}

function Education({ lang, items }: { lang: Language; items: RenderedResumeItem[] }) {
  return (
    <ResumeSection title={UI[lang].resume.sections.education}>
      <div className="space-y-8">
        {items.map((item) => (
          <article key={item.id} className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr] md:gap-10">
            <div className="text-sm font-medium text-ink-400">{item.period}</div>
            <div>
              <h3 className="text-lg font-bold text-ink-50">{item.school}</h3>
              <p className="mt-1 text-ink-300">{item.degree}</p>
            </div>
          </article>
        ))}
      </div>
    </ResumeSection>
  )
}

function ResumeSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-ink-800/60 py-14">
      <h2 className="mb-10 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function TechStack({ items, className = '' }: { items?: string[]; className?: string }) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((tech) => (
        <span
          key={tech}
          className="rounded-full border border-ink-700/60 bg-ink-800 px-2.5 py-1 text-xs font-medium text-ink-300"
        >
          {tech}
        </span>
      ))}
    </div>
  )
}

function PlayStoreIcon() {
  return (
    <IconSvg>
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zM14.906 13.114l2.432 2.432-11.93 6.804 9.498-9.236zm3.867-2.207L21.3 12.342a1 1 0 0 1 0 1.316l-2.527 1.435-2.736-2.593 2.736-2.593zM5.408 1.778l11.93 6.804-2.432 2.432L5.408 1.778z" />
    </IconSvg>
  )
}

function AppStoreIcon() {
  return (
    <IconSvg>
      <path d="M17.543 12.54a5.12 5.12 0 0 1 2.543-4.289 5.267 5.267 0 0 0-4.138-2.226c-1.738-.18-3.408 1.04-4.288 1.04-.895 0-2.249-1.018-3.7-.989a5.528 5.528 0 0 0-4.65 2.83c-1.99 3.45-.504 8.506 1.408 11.29.953 1.367 2.07 2.891 3.52 2.838 1.42-.06 1.956-.911 3.67-.911 1.699 0 2.198.91 3.683.876 1.527-.024 2.494-1.38 3.42-2.76a11.3 11.3 0 0 0 1.564-3.183 4.95 4.95 0 0 1-3.03-4.516zM14.723 4.2a5.09 5.09 0 0 0 1.16-3.633 5.18 5.18 0 0 0-3.353 1.735 4.852 4.852 0 0 0-1.189 3.502 4.31 4.31 0 0 0 3.383-1.604z" />
    </IconSvg>
  )
}
