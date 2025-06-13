'use client'

import { useRouter } from 'next/navigation'
import { getAppUrl } from '@/lib/utils'

export function ExampleGallery() {
  const router = useRouter()

  const handleTryFree = () => {
    const appUrl = getAppUrl()
    router.push(`/login?redirect=${encodeURIComponent(appUrl)}`)
  }

  return (
    <section id="examples" className="py-20 px-4 bg-gradient-to-br from-orange-50 to-rose-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
                            See the Magic 🎬
          </h2>
          <p className="text-xl text-rose-700 max-w-2xl mx-auto">
            Watch ordinary photos transform into extraordinary memories
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { title: 'Family Portrait', desc: 'Grandmother\'s wedding photo comes alive with gentle animation' },
            { title: 'Baby\'s First Smile', desc: 'Precious moments preserved with lifelike movement' },
            { title: 'Wedding Day', desc: 'Your special day animated with romantic motion' },
            { title: 'Pet Memories', desc: 'Beloved pets brought to life with natural animation' },
            { title: 'Vintage Photos', desc: 'Old family photos given new life and emotion' },
            { title: 'Special Moments', desc: 'Every memory deserves to be brought to life' }
          ].map((example, index) => (
            <div key={index} className="group cursor-pointer">
              <div className="bg-white/90 rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group-hover:scale-105 border border-rose-100">
                {/* Placeholder for actual video examples */}
                <div className="aspect-square bg-gradient-to-br from-coral-100 to-rose-100 flex items-center justify-center relative">
                  <div className="text-6xl opacity-40">🎬</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-800/10 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 text-orange-800">
                    <h3 className="font-semibold text-lg drop-shadow-sm">{example.title}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-rose-700">{example.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-rose-700 mb-6">Ready to bring your memories to life?</p>
          <button 
            onClick={handleTryFree}
            className="bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Try Your Free Clip
          </button>
        </div>
      </div>
    </section>
  )
} 