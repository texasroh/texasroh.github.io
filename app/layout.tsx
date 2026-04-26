import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, JetBrains_Mono, Noto_Sans_KR } from 'next/font/google'
import './globals.css'
import { DEFAULT_LANGUAGE, SITE_URL, UI } from '@/lib/site'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: UI[DEFAULT_LANGUAGE].site.title,
    template: `%s · ${UI[DEFAULT_LANGUAGE].site.title}`,
  },
  description: UI[DEFAULT_LANGUAGE].site.description,
  icons: {
    icon: '/assets/images/favicon.ico',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={DEFAULT_LANGUAGE} className="dark">
      <body
        className={`${inter.variable} ${notoSansKr.variable} ${jetBrainsMono.variable} bg-ink-900 font-sans text-ink-200 antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var p=location.pathname;document.documentElement.lang=p.indexOf('/en/')===0?'en':'ko';",
          }}
        />
        {children}
      </body>
    </html>
  )
}
