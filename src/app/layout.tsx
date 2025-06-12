import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Echoes - Bring Your Photos to Life',
  description: 'Transform static photos into animated video memories with AI',
  keywords: ['video', 'ai', 'memories', 'animation', 'photos'],
  authors: [{ name: 'Echoes Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#f97316',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
