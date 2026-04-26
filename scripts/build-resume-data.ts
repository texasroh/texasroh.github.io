import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getResumeContent, type ResumeItem } from '../lib/content'
import { renderMarkdownToHtml } from '../lib/markdown'
import { LANGUAGES, type Language } from '../lib/site'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outDir = path.join(root, 'public', 'data')

type RenderedItem = Omit<ResumeItem, 'content'> & { html: string }

async function renderItem(item: ResumeItem): Promise<RenderedItem> {
  const { content, ...rest } = item
  return { ...rest, html: await renderMarkdownToHtml(content) }
}

async function buildLang(lang: Language) {
  const resume = getResumeContent(lang)

  const rendered = {
    intro: resume.intro ? await renderItem(resume.intro) : undefined,
    experiences: await Promise.all(resume.experiences.map(renderItem)),
    otherExperiences: await Promise.all(resume.otherExperiences.map(renderItem)),
    skills: resume.skills ? await renderItem(resume.skills) : undefined,
    educations: await Promise.all(resume.educations.map(renderItem)),
  }

  const file = path.join(outDir, `resume-${lang}.json`)
  fs.writeFileSync(file, JSON.stringify(rendered))
  console.log(`  wrote ${path.relative(root, file)}`)
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  console.log('Building resume JSON data...')
  for (const lang of LANGUAGES) {
    await buildLang(lang)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
