'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()

  const handleTryFree = () => {
    const appUrl = getAppUrl()
    router.push(`/login?redirect=${encodeURIComponent(appUrl)}`)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-rose-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-orange-800">
              ECHOES
            </Link>
                            <span className="ml-2 text-orange-600 text-sm">🚀</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-rose-700 hover:text-coral-500 transition-colors">
              How It Works
            </a>
            <a href="#examples" className="text-rose-700 hover:text-coral-500 transition-colors">
              Examples
            </a>
            <a href="#pricing" className="text-rose-700 hover:text-coral-500 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-rose-700 hover:text-coral-500 transition-colors">
              Reviews
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={handleTryFree}
              className="bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105"
            >
              Try Free
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-rose-700"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-rose-100">
            <div className="flex flex-col space-y-4">
              <a href="#how-it-works" className="text-rose-700 hover:text-coral-500 transition-colors">
                How It Works
              </a>
              <a href="#examples" className="text-rose-700 hover:text-coral-500 transition-colors">
                Examples
              </a>
              <a href="#pricing" className="text-rose-700 hover:text-coral-500 transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-rose-700 hover:text-coral-500 transition-colors">
                Reviews
              </a>
              <button 
                onClick={handleTryFree}
                className="bg-gradient-to-r from-coral-400 to-rose-300 text-white font-semibold px-6 py-2 rounded-full w-fit"
              >
                Try Free
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 