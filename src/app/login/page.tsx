'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase'

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient()

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })

    if (error) {
      console.error('Error:', error)
    }
  }

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
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-rose-200 shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-orange-900 mb-3">
              Sign in to Echoes
            </h1>
            <p className="text-rose-700 text-lg">
              Create an account to generate and download your animated clip
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Why we need login */}
          <div className="border-t border-rose-200 pt-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-3 text-center">
              Why do I need to sign in?
            </h3>
            <ul className="space-y-2 text-rose-700">
              <li className="flex items-start gap-3">
                <span className="text-orange-600 mt-1">•</span>
                <span>Save and access your generated clips</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 mt-1">•</span>
                <span>Download your videos in high quality</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-600 mt-1">•</span>
                <span>Track your credit usage and history</span>
              </li>
            </ul>
          </div>

          {/* Trust indicators */}
          <div className="text-center mt-6 pt-4 border-t border-rose-200">
            <p className="text-rose-600 text-sm">
              🔒 Your privacy is protected. We never share your photos.
            </p>
          </div>
        </div>

        {/* Back to home link */}
        <div className="text-center mt-6">
          <a 
            href="/" 
            className="text-orange-700 hover:text-orange-800 font-medium"
          >
            ← Back to homepage
          </a>
        </div>
      </div>
    </div>
  )
} 