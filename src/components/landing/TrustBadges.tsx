import { Award, Brain, Gift } from 'lucide-react'

export function TrustBadges() {
  const badges = [
    {
      icon: Award,
      title: "Professional Quality",
      description: "High-resolution output perfect for printing, sharing, or displaying on any screen."
    },
    {
      icon: Brain,
      title: "AI-Powered",
      description: "Advanced machine learning creates natural, realistic animations that bring photos to life."
    },
    {
      icon: Gift,
      title: "Perfect Gifts",
      description: "Transform family memories into unforgettable presents that will be treasured forever."
    }
  ]

  return (
    <section className="section-soft py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Why Choose Echoes?
          </h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Trusted by families worldwide for bringing memories to life
          </p>
        </div>

        {/* Badges Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {badges.map((badge, index) => {
            const IconComponent = badge.icon
            return (
              <div key={index} className="text-center p-6 rounded-2xl bg-white border border-light-border hover:shadow-lg transition-shadow duration-300">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-accent-coral to-accent-teal rounded-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-primary mb-3">
                  {badge.title}
                </h3>
                <p className="text-secondary leading-relaxed">
                  {badge.description}
                </p>
              </div>
            )
          })}
        </div>


      </div>
    </section>
  )
} 