import { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Echoes - Transform Photos into Animated Clips',
  description: 'Create beautiful animated clips from your photos with Echoes.',
  icons: {
    icon: [
      { url: '/echoes-logo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32' }
    ],
    apple: '/echoes-logo.png',
  },
  openGraph: {
    title: 'Echoes - Transform Photos into Animated Clips',
    description: 'Create beautiful animated clips from your photos with Echoes.',
    images: ['/echoes-logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Echoes - Transform Photos into Animated Clips',
    description: 'Create beautiful animated clips from your photos with Echoes.',
    images: ['/echoes-logo.png'],
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
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
