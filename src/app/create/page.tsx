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
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Dashboard
          </Link>
        </div>

        {/* Main Generation Section - Full Width */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="echoes-logo.png" 
                alt="Echoes Logo" 
                className="h-6 w-6 mr-2"
              />
              <Sparkles className="h-6 w-6 text-orange-500 mr-2" />
              <h2 className="text-2xl font-bold text-gray-900">
                Create Your Video Clip
              </h2>
            </div>
            <p className="text-center text-gray-600 mb-6">
              Transform your photo into a cinematic moment. Your first clip is free!
            </p>
            
            <ClipGeneration />
          </div>

          {/* Compact Tips Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              💡 Quick Tips
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
              <div>High-quality photos work best</div>
              <div>Clear, well-lit images</div>
              <div>~30 second generation</div>
              <div>1 credit per clip</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 