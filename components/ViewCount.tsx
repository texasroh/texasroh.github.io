'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { collection, doc, getDoc, getDocs, increment, setDoc } from 'firebase/firestore'
import { firebaseEnabled, getDb } from '@/lib/firebase'

const VIEWS_COLLECTION = 'views'

/**
 * Shared map of slug -> view count, loaded once for a whole list so each
 * <ViewCount> on the page reads from a single Firestore query instead of one
 * read per post.
 */
const ViewCountsContext = createContext<Map<string, number> | null>(null)

export function ViewCountsProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<Map<string, number> | null>(null)

  useEffect(() => {
    const db = getDb()
    if (!db) {
      return
    }

    let cancelled = false

    getDocs(collection(db, VIEWS_COLLECTION))
      .then((snapshot) => {
        if (cancelled) {
          return
        }
        const map = new Map<string, number>()
        snapshot.forEach((entry) => {
          map.set(entry.id, (entry.data().count as number) ?? 0)
        })
        setCounts(map)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return <ViewCountsContext.Provider value={counts}>{children}</ViewCountsContext.Provider>
}

type ViewCountProps = {
  slug: string
  label: string
  /** When true, atomically increments the count once per browser session. */
  track?: boolean
  className?: string
}

export function ViewCount({ slug, label, track = false, className }: ViewCountProps) {
  const shared = useContext(ViewCountsContext)
  const [tracked, setTracked] = useState<number | null>(null)

  useEffect(() => {
    if (!track || !firebaseEnabled) {
      return
    }

    const db = getDb()
    if (!db) {
      return
    }

    const ref = doc(db, VIEWS_COLLECTION, slug)
    let cancelled = false

    async function run() {
      const sessionKey = `viewed:${slug}`
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1')
        await setDoc(ref, { count: increment(1) }, { merge: true }).catch(() => {})
      }

      const snapshot = await getDoc(ref).catch(() => null)
      if (!cancelled && snapshot) {
        setTracked(snapshot.exists() ? ((snapshot.data().count as number) ?? 0) : 0)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [slug, track])

  // Detail page uses the tracked count; list items read from the shared map
  // (null while still loading, so we render nothing until it resolves).
  const count = track ? tracked : shared ? (shared.get(slug) ?? 0) : null

  if (count === null) {
    return null
  }

  return (
    <span className={className}>
      {count.toLocaleString()} {label}
    </span>
  )
}
