export function TrustBadges() {
  const features = [
    {
      icon: '🔒',
      title: 'Privacy-First',
      description: 'Your photos stay secure and are never shared'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Get your animated video in just 2 minutes'
    },
    {
      icon: '📱',
      title: 'Works Everywhere',
      description: 'Perfect on mobile, tablet, and desktop'
    },
    {
      icon: '🎯',
      title: 'Professional Quality',
      description: 'High-resolution output ready for any use'
    },
    {
      icon: '💝',
      title: 'Perfect Gifts',
      description: 'Create unforgettable presents for loved ones'
    },
    {
      icon: '🌟',
      title: 'No Experience Needed',
      description: 'Simple enough for anyone to use'
    }
  ]

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
            Why Families Trust Echoes
          </h2>
          <p className="text-xl text-rose-700 max-w-2xl mx-auto">
            Everything you need to transform your memories safely and beautifully
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white/90 rounded-2xl p-6 border border-rose-100 hover:border-coral-300 hover:shadow-md transition-all duration-300">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-orange-800 mb-3">
                {feature.title}
              </h3>
              <p className="text-rose-700 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Security Note */}
        <div className="text-center mt-16 p-8 bg-white/90 rounded-2xl border border-rose-100">
          <div className="text-3xl mb-4">🛡️</div>
          <h3 className="text-xl font-bold text-orange-800 mb-3">
            Your Memories Are Safe
          </h3>
          <p className="text-rose-700 max-w-2xl mx-auto">
            We use enterprise-grade security to protect your photos. Your images are processed securely and never stored permanently on our servers.
          </p>
        </div>
      </div>
    </section>
  )
} 