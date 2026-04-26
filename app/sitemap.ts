import type { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/content'
import { SITE_URL, absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: `${SITE_URL}/ko/blog/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/en/blog/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...getAllPosts().map((post) => ({
      url: absoluteUrl(post.url),
      lastModified: new Date(`${post.date}T00:00:00`),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
