'use client'

import Link from 'next/link'
import { useSmartLogin } from '@/hooks/useSmartLogin'

export function Footer() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  return (
    <footer className="section-soft py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-3 mb-4 w-fit">
              <img 
                src="echoes-logo.png" 
                alt="Echoes Logo" 
                className="h-8 w-8"
              />
              <h3 className="text-2xl font-bold text-primary">echoes</h3>
            </Link>
            <p className="text-secondary leading-relaxed">
              Bringing memories to life with AI-powered animation. 
              Transform your cherished photos into magical videos.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-primary mb-4">Quick Start</h4>
            <ul className="space-y-2 text-secondary">
              <li><Link href="/dashboard" className="hover:text-accent-coral transition-colors">Try Free Clip</Link></li>
              <li><a href="#how-it-works" className="hover:text-accent-coral transition-colors">How It Works</a></li>
              <li><a href="#examples" className="hover:text-accent-coral transition-colors">Examples</a></li>
              <li><a href="#pricing" className="hover:text-accent-coral transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-primary mb-4">Support</h4>
            <ul className="space-y-2 text-secondary">
              <li><Link href="/privacy" className="hover:text-accent-coral transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-accent-coral transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-accent-coral transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-light-border pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-secondary text-sm mb-4 md:mb-0">
            &copy; 2024 Echoes. Made with ❤️ for preserving memories.
          </p>
          
          {/* Final CTA */}
          <button 
            onClick={handleSmartLogin}
            disabled={isLoading}
            className="btn-gradient px-6 py-3"
          >
            {isLoading ? 'Loading...' : 'Start Creating'}
          </button>
        </div>
      </div>
    </footer>
  )
} 