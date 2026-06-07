import { getAllPosts } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  // Use the most recent post date as the blog sitemap's lastmod.
  const latest = getAllPosts().reduce<string | null>((acc, post) => {
    return !acc || post.date > acc ? post.date : acc
  }, null)
  const lastmod = latest
    ? new Date(`${latest}T00:00:00`).toISOString()
    : new Date().toISOString()

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap>
<loc>${SITE_URL}/sitemap-blog.xml</loc>
<lastmod>${lastmod}</lastmod>
</sitemap>
</sitemapindex>
`

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
