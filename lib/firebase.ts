import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Firebase web config is not secret — access is governed by Firestore rules.
// Disabled in development (`next dev`) so local browsing never inflates the
// production view counts or pollutes Analytics; the production build keeps it on.
// Also no-ops when env vars are missing, so unconfigured builds still work.
const isProduction = process.env.NODE_ENV === 'production'
export const firebaseEnabled =
  isProduction && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

// Analytics needs a measurementId on top of the base config; it stays off until
// Google Analytics is enabled on the project and the id is provided.
export const analyticsEnabled = firebaseEnabled && Boolean(firebaseConfig.measurementId)

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) {
    return null
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

let cachedDb: Firestore | null = null

export function getDb(): Firestore | null {
  if (cachedDb) {
    return cachedDb
  }

  const app = getFirebaseApp()
  if (!app) {
    return null
  }

  cachedDb = getFirestore(app)
  return cachedDb
}

let analyticsPromise: Promise<Analytics | null> | null = null

// Resolves to an Analytics instance in supported browsers, null otherwise.
// Calling it initializes GA4, which emits the first page_view; subsequent
// client-side route changes are picked up by GA4 enhanced measurement.
export function getAnalyticsClient(): Promise<Analytics | null> {
  if (!analyticsEnabled || typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported()
      .then((supported) => {
        const app = getFirebaseApp()
        return supported && app ? getAnalytics(app) : null
      })
      .catch(() => null)
  }

  return analyticsPromise
}
