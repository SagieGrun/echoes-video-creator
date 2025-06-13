import { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Echoes - Transform Photos into Animated Clips',
  description: 'Create beautiful animated clips from your photos with Echoes.',
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
