'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase'

// Helper function to get app URL based on environment
const getAppUrl = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  return isDevelopment ? '/dashboard' : process.env.NEXT_PUBLIC_APP_URL || 'https://your-echoes.com'
}

type Clip = {
  id: string
  project_id: string
  image_url: string
  video_url: string | null
  prompt: string
  status: 'generating' | 'ready' | 'error'
}

export default function ClipPage({ params }: { params: { id: string } }) {
  const [clip, setClip] = useState<Clip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const appUrl = getAppUrl()

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }

    const fetchClip = async () => {
      try {
        const { data, error } = await supabase
          .from('clips')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        setClip(data)
      } catch (error) {
        console.error('Error fetching clip:', error)
        setError('Failed to load clip')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
    fetchClip()
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your clip...</p>
        </div>
      </div>
    )
  }

  if (error || !clip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Clip not found'}</p>
          <Link
            href={appUrl}
            className="inline-flex items-center text-orange-600 hover:text-orange-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Create
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href={appUrl}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Create
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {clip.status === 'generating' ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Generating Your Clip
              </h2>
              <p className="text-gray-600">
                This usually takes about 2 minutes. We'll notify you when it's ready.
              </p>
            </div>
          ) : clip.status === 'error' ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">Failed to generate clip</p>
              <Link
                href={appUrl}
                className="inline-flex items-center text-orange-600 hover:text-orange-700"
              >
                Try Again
              </Link>
            </div>
          ) : (
            <div className="relative">
              {clip.video_url && (
                <video
                  src={clip.video_url}
                  controls
                  className="w-full rounded-lg"
                  poster={clip.image_url}
                />
              )}
              {!isAuthenticated && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="text-center p-8">
                    <h2 className="text-2xl font-bold text-white mb-4">
                      Sign Up to View Your Clip
                    </h2>
                    <p className="text-white/80 mb-6">
                      Create an account to view and download your clip
                    </p>
                    <Link
                      href="/signup"
                      className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
                    >
                      Sign Up Now
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 