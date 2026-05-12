'use client'

import { useEffect, useState } from 'react'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import type { Language } from '@/lib/site'
import { buildPageViewDocId, getViewStatsCopy, VIEW_STATS_COLLECTION } from '@/lib/viewStats'

type Props = {
  lang: Language
  path: string
}

type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  appId: string
  messagingSenderId?: string
  measurementId?: string
  storageBucket?: string
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

export function PostCardViewCounter({ lang, path }: Props) {
  const [views, setViews] = useState<number | null>(null)
  const copy = getViewStatsCopy(lang)

  useEffect(() => {
    const db = getFirestoreInstance()

    if (!db) {
      return
    }

    const run = async () => {
      const pageRef = doc(db, VIEW_STATS_COLLECTION, buildPageViewDocId(path))
      const snapshot = await getDoc(pageRef)
      const data = snapshot.data()
      setViews(typeof data?.views === 'number' ? data.views : 0)
    }

    run().catch((error) => {
      console.error('Failed to load post card views', error)
    })
  }, [path])

  return (
    <span className="rounded-full border border-ink-800/80 bg-ink-900/70 px-2.5 py-1 text-xs text-ink-400">
      {copy.viewsLabel} {views === null ? '...' : new Intl.NumberFormat(lang === 'ko' ? 'ko-KR' : 'en-US').format(views)}
    </span>
  )
}
