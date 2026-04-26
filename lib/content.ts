import fs from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import matter from 'gray-matter'
import type { Language } from './site'
import { LANGUAGES, isLanguage } from './site'

const ROOT = process.cwd()
const POSTS_DIR = path.join(ROOT, '_posts')
const RESUME_DIR = path.join(ROOT, '_resume')
const CONTENT_EXTENSIONS = new Set(['.md', '.mdx'])

export type ResumeSection = 'intro' | 'experience' | 'other_experience' | 'skills' | 'education'

export type ResumeItem = {
  id: string
  lang: Language
  section: ResumeSection
  order: number
  content: string
  company?: string
  role?: string
  location?: string
  period_start?: string
  period_end?: string
  description?: string
  tech_stack?: string[]
  title?: string
  period?: string
  link?: string
  play_store?: string
  app_store?: string
  school?: string
  degree?: string
  skills?: Array<{
    category: string
    items: string[]
  }>
}

export type ResumeContent = {
  intro?: ResumeItem
  experiences: ResumeItem[]
  otherExperiences: ResumeItem[]
  skills?: ResumeItem
  educations: ResumeItem[]
}

export type RenderedResumeItem = Omit<ResumeItem, 'content'> & { html: string }

export type RenderedResumeContent = {
  intro?: RenderedResumeItem
  experiences: RenderedResumeItem[]
  otherExperiences: RenderedResumeItem[]
  skills?: RenderedResumeItem
  educations: RenderedResumeItem[]
}

export type Post = {
  id: string
  lang: Language
  title: string
  date: string
  slug: string
  description?: string
  tags: string[]
  content: string
  url: string
  readingMinutes: number
  excerpt: string
}

function readContentFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  return fs
    .readdirSync(dir)
    .filter((file) => CONTENT_EXTENSIONS.has(path.extname(file)))
    .sort()
    .map((file) => path.join(dir, file))
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item))
}

function normalizeDate(value: unknown, fallback: string): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string' && value.trim()) {
    return value.slice(0, 10)
  }

  return fallback
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_\-~]/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function makeExcerpt(content: string, maxLength = 160): string {
  const plain = stripMarkdown(content)
  if (plain.length <= maxLength) {
    return plain
  }

  return `${plain.slice(0, maxLength).trimEnd()}...`
}

function readingMinutes(content: string, lang: Language): number {
  const plain = stripMarkdown(content)

  if (lang === 'ko') {
    const chars = plain.replace(/\s/g, '').length
    return Math.max(1, Math.ceil(chars / 500))
  }

  const words = plain.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function parsePost(lang: Language, filePath: string): Post | null {
  const basename = path.basename(filePath).replace(/\.(md|mdx)$/, '')
  const match = basename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/)

  if (!match) {
    return null
  }

  const [, year, month, day, slug] = match
  const source = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(source)
  const frontmatterLang = typeof data.lang === 'string' && isLanguage(data.lang) ? data.lang : lang
  const date = normalizeDate(data.date, `${year}-${month}-${day}`)
  const description = typeof data.description === 'string' ? data.description : undefined
  const title = typeof data.title === 'string' ? data.title : slug

  return {
    id: `${frontmatterLang}/${basename}`,
    lang: frontmatterLang,
    title,
    date,
    slug,
    description,
    tags: normalizeStringArray(data.tags),
    content,
    url: `/${frontmatterLang}/blog/${slug}/`,
    readingMinutes: readingMinutes(content, frontmatterLang),
    excerpt: description ?? makeExcerpt(content),
  }
}

function parseResumeItem(lang: Language, filePath: string): ResumeItem | null {
  const id = path.basename(filePath).replace(/\.(md|mdx)$/, '')
  const source = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(source)

  if (typeof data.section !== 'string') {
    return null
  }

  return {
    ...data,
    id,
    lang,
    section: data.section as ResumeSection,
    order: Number(data.order ?? 0),
    content,
    tech_stack: normalizeStringArray(data.tech_stack),
  } as ResumeItem
}

function assertUniqueSlugs(posts: Post[]): void {
  const seen = new Map<Language, Map<string, string>>()

  for (const post of posts) {
    let langMap = seen.get(post.lang)
    if (!langMap) {
      langMap = new Map<string, string>()
      seen.set(post.lang, langMap)
    }

    const existing = langMap.get(post.slug)
    if (existing) {
      throw new Error(
        `Duplicate blog slug "${post.slug}" in language "${post.lang}": ${existing} and ${post.id}. ` +
          `Slugs must be unique within each language. Rename one of the files.`,
      )
    }
    langMap.set(post.slug, post.id)
  }
}

export const getAllPosts = cache((): Post[] => {
  const posts = LANGUAGES.flatMap((lang) => {
    const langDir = path.join(POSTS_DIR, lang)
    return readContentFiles(langDir)
      .map((filePath) => parsePost(lang, filePath))
      .filter((post): post is Post => Boolean(post))
  }).sort((a, b) => b.date.localeCompare(a.date))

  assertUniqueSlugs(posts)
  return posts
})

export function getPostsByLanguage(lang: Language): Post[] {
  return getAllPosts().filter((post) => post.lang === lang)
}

export function getPostBySlug(params: { lang: Language; slug: string }): Post | undefined {
  return getAllPosts().find(
    (post) => post.lang === params.lang && post.slug === params.slug,
  )
}

export function getPostTranslation(post: Post, lang: Language): Post | undefined {
  return getAllPosts().find((candidate) => candidate.lang === lang && candidate.slug === post.slug)
}

export const getResumeContent = cache((lang: Language): ResumeContent => {
  const items = readContentFiles(path.join(RESUME_DIR, lang))
    .map((filePath) => parseResumeItem(lang, filePath))
    .filter((item): item is ResumeItem => Boolean(item))

  const bySection = (section: ResumeSection) =>
    items.filter((item) => item.section === section).sort((a, b) => a.order - b.order)

  return {
    intro: bySection('intro')[0],
    experiences: bySection('experience'),
    otherExperiences: bySection('other_experience'),
    skills: bySection('skills')[0],
    educations: bySection('education'),
  }
})
