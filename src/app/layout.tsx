import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'StockBeacon - Your Beginner-Friendly Stock Signal Platform',
    template: '%s'
  },
  description: 'Simplifying stock investing through actionable recommendations, clear scoring, and confidence-building UX',
  keywords: ['stocks', 'investing', 'signals', 'portfolio', 'trading'],
  authors: [{ name: 'StockBeacon' }],
  creator: 'StockBeacon',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'StockBeacon',
    description: 'Your Beginner-Friendly Stock Signal Platform',
    siteName: 'StockBeacon',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StockBeacon',
    description: 'Your Beginner-Friendly Stock Signal Platform',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
