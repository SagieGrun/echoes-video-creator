'use client'

import Link from 'next/link'
import { useSmartLogin } from '@/hooks/useSmartLogin'

export function Footer() {
  const { handleSmartLogin, isLoading } = useSmartLogin()
  return (
    <footer className="bg-gradient-to-br from-orange-300 via-rose-300 to-purple-300 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center space-x-3 mb-4 w-fit">
              <img 
                src="/echoes-logo.png" 
                alt="Echoes Logo" 
                className="h-8 w-8"
              />
              <h3 className="text-2xl font-bold text-orange-900">echoes</h3>
            </Link>
            <p className="text-rose-800 leading-relaxed">
              Bringing memories to life with AI-powered animation. 
              Transform your cherished photos into magical videos.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-orange-900 mb-4">Quick Start</h4>
            <ul className="space-y-2 text-rose-800">
              <li><a href="#" className="hover:text-coral-600 transition-colors">Try Free Clip</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">Examples</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">Pricing</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-orange-900 mb-4">Support</h4>
            <ul className="space-y-2 text-rose-800">
              <li><a href="#" className="hover:text-coral-600 transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-coral-600 transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-rose-400 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-rose-800 text-sm mb-4 md:mb-0">
            &copy; 2024 Echoes. Made with ❤️ for preserving memories.
          </p>
          
          {/* Final CTA */}
          <button 
            onClick={handleSmartLogin}
            disabled={isLoading}
            className="bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Start Creating'}
          </button>
        </div>
      </div>
    </footer>
  )
} 