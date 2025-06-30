import { Metadata, Viewport } from 'next'
import './globals.css'
import ReferralTracker from '@/components/ReferralTracker'

export const metadata: Metadata = {
  title: 'Echoes - Transform Photos into Animated Clips',
  description: 'Create beautiful animated clips from your photos with Echoes.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Echoes - Transform Photos into Animated Clips',
    description: 'Create beautiful animated clips from your photos with Echoes.',
    images: ['/social-share.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Echoes - Transform Photos into Animated Clips',
    description: 'Create beautiful animated clips from your photos with Echoes.',
    images: ['/social-share.png'],
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
        <ReferralTracker />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
