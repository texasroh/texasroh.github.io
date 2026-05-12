'use client'

import { useEffect, useMemo, useState } from 'react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import type { Language } from '@/lib/site'
import {
  buildPageViewDocId,
  getViewStatsCopy,
  shouldCountView,
  SITE_TOTALS_DOC,
  VIEW_STATS_COLLECTION,
  type ViewTarget,
} from '@/lib/viewStats'

type CounterMode = 'page' | 'site'

type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  messagingSenderId?: string
  measurementId?: string
  storageBucket?: string
}

type ViewCounterProps = {
  mode: CounterMode
  lang: Language
  target?: ViewTarget
}

type CounterState = {
  views: number | null
  visitors: number | null
}

function getFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  }
}

function getFirestoreInstance() {
  const config = getFirebaseConfig()

  if (!config) {
    return null
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  return getFirestore(app)
}

function formatNumber(value: number | null, lang: Language): string {
  if (value === null) {
    return '...'
  }

  return new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US').format(value)
}

export function ViewCounter({ mode, lang, target }: ViewCounterProps) {
  const copy = useMemo(() => getViewStatsCopy(lang), [lang])
  const [state, setState] = useState<CounterState>({ views: null, visitors: null })

  useEffect(() => {
    const db = getFirestoreInstance()

    if (!db) {
      return
    }

    const run = async () => {
      if (mode === 'site') {
        const siteRef = doc(db, VIEW_STATS_COLLECTION, SITE_TOTALS_DOC)
        const snapshot = await getDoc(siteRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          setState({
            views: typeof data.totalViews === 'number' ? data.totalViews : 0,
            visitors: typeof data.uniqueVisitors === 'number' ? data.uniqueVisitors : 0,
          })
        }
        return
      }

      if (!target) {
        return
      }

      const pageId = buildPageViewDocId(target.path)
      const pageRef = doc(db, VIEW_STATS_COLLECTION, pageId)
      const siteRef = doc(db, VIEW_STATS_COLLECTION, SITE_TOTALS_DOC)
      const countUnique = shouldCountView(target.path)

      if (countUnique) {
        await Promise.all([
          setDoc(
            pageRef,
            {
              path: target.path,
              title: target.title,
              lang: target.lang,
              views: increment(1),
              uniqueVisitors: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          setDoc(
            siteRef,
            {
              totalViews: increment(1),
              uniqueVisitors: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ])
      } else {
        await Promise.all([
          setDoc(
            pageRef,
            {
              path: target.path,
              title: target.title,
              lang: target.lang,
              views: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
          setDoc(
            siteRef,
            {
              totalViews: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ])
      }

      const [pageSnapshot, siteSnapshot] = await Promise.all([getDoc(pageRef), getDoc(siteRef)])
      const pageData = pageSnapshot.data()
      const siteData = siteSnapshot.data()

      setState({
        views: typeof pageData?.views === 'number' ? pageData.views : 0,
        visitors: typeof pageData?.uniqueVisitors === 'number' ? pageData.uniqueVisitors : 0,
      })

      if (siteData && mode === 'page') {
        void siteData
      }
    }

    run().catch((error) => {
      console.error('Failed to load view stats', error)
    })
  }, [mode, target, lang])

  const labels: Array<[string, number | null]> =
    mode === 'site'
      ? [
          [copy.totalViewsLabel, state.views],
          [copy.totalVisitorsLabel, state.visitors],
        ]
      : [
          [copy.viewsLabel, state.views],
          [copy.uniqueVisitorLabel, state.visitors],
        ]

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500">
      {labels.map(([label, value]) => (
        <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-ink-800/80 bg-ink-900/70 px-3 py-1">
          <span>{label}</span>
          <strong className="font-medium text-ink-300">{formatNumber(value, lang)}</strong>
        </span>
      ))}
    </div>
  )
}
