'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ClipGeneration } from '@/components/generation/ClipGeneration'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function CreatePage() {
  const router = useRouter()
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
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Main Generation Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center mb-6">
              <Sparkles className="h-8 w-8 text-orange-500 mr-3" />
              <h2 className="text-3xl font-bold text-gray-900">
                Create Your Free Clip
              </h2>
            </div>
            
            <ClipGeneration />
          </div>

          {/* Information Panel */}
          <div className="space-y-8">
            {/* What You'll Get */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                What You'll Get
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500 font-bold">✓</span>
                  <span className="ml-3 text-gray-600">
                    Beautiful AI-animated clip from your photo
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500 font-bold">✓</span>
                  <span className="ml-3 text-gray-600">
                    High-quality 5-second video
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500 font-bold">✓</span>
                  <span className="ml-3 text-gray-600">
                    Download and share instantly
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-orange-500 font-bold">✓</span>
                  <span className="ml-3 text-gray-600">
                    1 free credit to get started
                  </span>
                </li>
              </ul>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                How It Works
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium text-sm">
                    1
                  </span>
                  <span className="ml-3 text-gray-600">
                    Upload your favorite photo (JPG or PNG)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium text-sm">
                    2
                  </span>
                  <span className="ml-3 text-gray-600">
                    Our AI creates a beautiful animated clip
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-medium text-sm">
                    3
                  </span>
                  <span className="ml-3 text-gray-600">
                    Download and share your magical video
                  </span>
                </li>
              </ol>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Pro Tips
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Use high-quality photos for best results</li>
                <li>• Clear, well-lit images work better</li>
                <li>• Generation takes about 20-30 seconds</li>
                <li>• Each clip costs 1 credit</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 