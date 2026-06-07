import { getAllPosts } from '@/lib/content'
import { SITE_URL, absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

type Entry = {
  loc: string
  lastmod: string
  changefreq: 'weekly' | 'monthly'
  priority: string
}

export function GET() {
  const now = new Date().toISOString()

  const entries: Entry[] = [
    { loc: `${SITE_URL}/ko/blog/`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/en/blog/`, lastmod: now, changefreq: 'weekly', priority: '0.8' },
    ...getAllPosts().map((post) => ({
      loc: absoluteUrl(post.url),
      lastmod: new Date(`${post.date}T00:00:00`).toISOString(),
      changefreq: 'monthly' as const,
      priority: '0.6',
    })),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `<url>
<loc>${entry.loc}</loc>
<lastmod>${entry.lastmod}</lastmod>
<changefreq>${entry.changefreq}</changefreq>
<priority>${entry.priority}</priority>
</url>`,
  )
  .join('\n')}
</urlset>
`

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
