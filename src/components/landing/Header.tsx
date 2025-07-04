'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSmartLogin } from '@/hooks/useSmartLogin'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { handleSmartLogin, isLoading } = useSmartLogin()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-clean-white/95 backdrop-blur-sm border-b border-light-border">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <img 
                src="echoes-logo.png" 
                alt="Echoes Logo" 
                className="h-8 w-8 flex-shrink-0"
              />
              <span className="text-xl font-bold text-deep-charcoal leading-none">echoes</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-deep-charcoal hover:text-accent-coral transition-colors">
              How It Works
            </a>
            <a href="#examples" className="text-deep-charcoal hover:text-accent-coral transition-colors">
              Examples
            </a>
            <a href="#pricing" className="text-deep-charcoal hover:text-accent-coral transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-deep-charcoal hover:text-accent-coral transition-colors">
              Reviews
            </a>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={handleSmartLogin}
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Loading...' : 'Login'}
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-deep-charcoal"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-light-border">
            <div className="flex flex-col space-y-4">
              <a href="#how-it-works" className="text-deep-charcoal hover:text-accent-coral transition-colors">
                How It Works
              </a>
              <a href="#examples" className="text-deep-charcoal hover:text-accent-coral transition-colors">
                Examples
              </a>
              <a href="#pricing" className="text-deep-charcoal hover:text-accent-coral transition-colors">
                Pricing
              </a>
              <a href="#testimonials" className="text-deep-charcoal hover:text-accent-coral transition-colors">
                Reviews
              </a>
              <button 
                onClick={handleSmartLogin}
                disabled={isLoading}
                className="btn-primary w-fit"
              >
                {isLoading ? 'Loading...' : 'Login'}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 