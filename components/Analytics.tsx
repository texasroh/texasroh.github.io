'use client'

import { useEffect } from 'react'
import { getAnalyticsClient } from '@/lib/firebase'

/**
 * Initializes Firebase Analytics (GA4) on the client. Mounting it emits the
 * first page_view; GA4 enhanced measurement (on by default) tracks subsequent
 * client-side navigations. No-ops until NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is set.
 */
export function Analytics() {
  useEffect(() => {
    getAnalyticsClient()
  }, [])

  return null
}
