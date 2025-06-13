export function PricingSection() {
  const plans = [
    {
      name: 'Social Pack',
      price: '$15',
      period: '5 credits',
      description: 'Perfect for social media sharing',
      features: [
        '5 animated clips (25 seconds)',
        'Ideal for Instagram/TikTok',
        'Quick emotional impact',
        'Perfect for single moments',
        'High quality (1080p)',
        'No watermark',
        'Commercial license'
      ],
      cta: 'Start Creating',
      popular: false,
      highlight: false
    },
    {
      name: 'Gift Pack',
      price: '$45',
      period: '20 credits',
      description: 'Best for heartfelt presents',
      features: [
        '20 animated clips (1:40 minutes)',
        'Perfect for birthday gifts',
        'Great for family events',
        'Tell a complete story',
        'Ultra HD quality (4K)',
        'Family sharing included',
        'Commercial license'
      ],
      cta: 'Get Gift Pack',
      popular: true,
      highlight: true
    },
    {
      name: 'Legacy Pack',
      price: '$80',
      period: '40 credits',
      description: 'For digital frames & keepsakes',
      features: [
        '40 animated clips (3:20 minutes)',
        'Ideal for digital frames',
        'Perfect for photo albums',
        'Complete family stories',
        'Ultra HD quality (4K)',
        'Family sharing included',
        'Commercial license'
      ],
      cta: 'Get Legacy Pack',
      popular: false,
      highlight: false
    }
  ]

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
            Create Lasting Memories
          </h2>
          <p className="text-xl text-rose-700 max-w-2xl mx-auto">
            Each credit creates a 5-second animated clip. Choose the perfect length for your story.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative rounded-3xl p-8 transition-all duration-300 hover:scale-105 ${
                plan.highlight 
                  ? 'bg-white border-2 border-coral-400 shadow-lg' 
                  : 'bg-white/90 border border-rose-100 shadow-md'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-coral-400 to-rose-300 text-white px-5 py-2 rounded-full text-base font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-orange-800 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-coral-500">{plan.price}</span>
                  <span className="text-rose-600 ml-1">/{plan.period}</span>
                </div>
                <p className="text-rose-700">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <span className="text-coral-400 mr-3 text-lg font-bold">✓</span>
                    <span className="text-rose-700 text-base">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button 
                className={`w-full py-3 px-6 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 ${
                  plan.highlight
                    ? 'bg-gradient-to-r from-coral-400 to-rose-300 hover:from-coral-500 hover:to-rose-400 text-white shadow-lg'
                    : 'bg-white border-2 border-coral-400 text-coral-500 hover:bg-coral-50'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>




      </div>
    </section>
  )
} 