'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { PhotoUpload } from '@/components/upload/PhotoUpload'
import { uploadPhoto } from '@/lib/supabase/storage'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function CreatePage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedPhoto, setUploadedPhoto] = useState<{ path: string; url: string; projectId: string } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      
      if (!session) {
        // Redirect to login if not authenticated
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const handlePhotoSelected = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadError(null)
      const result = await uploadPhoto(file)
      setUploadedPhoto(result)
    } catch (error) {
      console.error('Error uploading photo:', error)
      if (error instanceof Error) {
        if (error.message.includes('logged in')) {
          setUploadError('Please log in to upload photos.')
          router.push('/login')
        } else {
          setUploadError(error.message || 'Failed to upload photo. Please try again.')
        }
      } else {
        setUploadError('Failed to upload photo. Please try again.')
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerateClip = async () => {
    if (!uploadedPhoto) return

    try {
      setIsGenerating(true)
      setGenerationError(null)

      const response = await fetch('/api/clips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoUrl: uploadedPhoto.url,
          projectId: uploadedPhoto.projectId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate clip')
      }

      const { clipId } = await response.json()
      router.push(`/clips/${clipId}`)
    } catch (error) {
      console.error('Error generating clip:', error)
      setGenerationError('Failed to generate clip. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render the main content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Create Your Free Clip
            </h2>
            <div className="space-y-6">
              <PhotoUpload
                onPhotoSelected={handlePhotoSelected}
                maxSize={5 * 1024 * 1024} // 5MB
                acceptedTypes={['image/jpeg', 'image/png']}
              />
              {isUploading && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-gray-600">Uploading your photo...</p>
                </div>
              )}
              {uploadError && (
                <p className="text-red-500 text-sm">{uploadError}</p>
              )}
              {uploadedPhoto && (
                <button
                  onClick={handleGenerateClip}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Clip'}
                </button>
              )}
              {generationError && (
                <p className="text-red-500 text-sm">{generationError}</p>
              )}
            </div>
          </div>

          {/* Value Props */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                What You'll Get
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500">✓</span>
                  <span className="ml-3 text-gray-600">
                    A beautiful animated clip with your photo
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500">✓</span>
                  <span className="ml-3 text-gray-600">
                    Watermarked version for free
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500">✓</span>
                  <span className="ml-3 text-gray-600">
                    Download in high quality
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                How It Works
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium">
                    1
                  </span>
                  <span className="ml-3 text-gray-600">
                    Upload your photo
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium">
                    2
                  </span>
                  <span className="ml-3 text-gray-600">
                    We'll generate your clip
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium">
                    3
                  </span>
                  <span className="ml-3 text-gray-600">
                    Sign up to view and download
                  </span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 