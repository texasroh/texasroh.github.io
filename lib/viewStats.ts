import type { Language } from '@/lib/site'

export const VIEW_STATS_COLLECTION = 'view_stats'
export const SITE_TOTALS_DOC = 'site-totals'
const STORAGE_PREFIX = 'jr-viewed:'
const VIEW_TTL_MS = 1000 * 60 * 60 * 24

export type ViewStatsCopy = {
  viewsLabel: string
  uniqueVisitorLabel: string
  totalViewsLabel: string
  totalVisitorsLabel: string
  loadingLabel: string
}

export type ViewTarget = {
  path: string
  title: string
  lang: Language
}

export function buildPageViewDocId(path: string): string {
  return encodeURIComponent(path)
}

export function shouldCountView(path: string, now = Date.now()): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const key = `${STORAGE_PREFIX}${path}`
    const previous = window.localStorage.getItem(key)

    if (!previous) {
      window.localStorage.setItem(key, String(now))
      return true
    }

    const previousTs = Number(previous)

    if (!Number.isFinite(previousTs) || now - previousTs > VIEW_TTL_MS) {
      window.localStorage.setItem(key, String(now))
      return true
    }

    return false
  } catch {
    return true
  }
}

export function getViewStatsCopy(lang: Language): ViewStatsCopy {
  return lang === 'ko'
    ? {
        viewsLabel: '조회수',
        uniqueVisitorLabel: '방문자',
        totalViewsLabel: '총 조회수',
        totalVisitorsLabel: '총 방문자',
        loadingLabel: '불러오는 중',
      }
    : {
        viewsLabel: 'Views',
        uniqueVisitorLabel: 'Visitors',
        totalViewsLabel: 'Total views',
        totalVisitorsLabel: 'Total visitors',
        loadingLabel: 'Loading',
      }
}
