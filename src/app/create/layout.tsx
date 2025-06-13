import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Clip - Echoes',
  description: 'Transform your photos into beautiful animated clips with Echoes.',
}

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 