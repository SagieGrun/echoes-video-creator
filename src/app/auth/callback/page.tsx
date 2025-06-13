'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // The actual auth processing happens in the route handler
    // This page just shows a loading state while that happens
    const timer = setTimeout(() => {
      // Fallback redirect if something goes wrong
      router.push('/create')
    }, 10000) // 10 second timeout

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-rose-200 to-purple-200 flex items-center justify-center px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-rose-200 shadow-xl text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-6" />
          
          <h1 className="text-2xl font-bold text-orange-900 mb-4">
            Setting up your account...
          </h1>
          
          <p className="text-rose-700 mb-6">
            We're creating your profile and setting up your free credit. This will just take a moment.
          </p>
          
          <div className="space-y-2 text-sm text-rose-600">
            <p>✓ Authenticating with Google</p>
            <p>✓ Creating your profile</p>
            <p>✓ Adding your free credit</p>
            <p className="text-orange-600">→ Redirecting to create page...</p>
          </div>
        </div>
      </div>
    </div>
  )
} 