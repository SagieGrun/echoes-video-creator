export function TestimonialSection() {
  const testimonials = [
    {
      name: "Sarah Johnson",
      content: "This brought tears to my eyes! My grandmother's wedding photo came to life in the most beautiful way. It's like she's still with us."
    },
    {
      name: "Michael Chen",
      content: "I bought this as a birthday gift for my grandparents and they absolutely loved it. Seeing their old wedding photo come to life was magical for the whole family."
    },
    {
      name: "Emma Williams",
      content: "Finally, a way to preserve our family memories that feels magical. My kids were amazed when they saw their great-grandfather's photo animated."
    }
  ]

  return (
    <section id="testimonials" className="section-clean py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            What people are saying
          </h2>
          <p className="text-xl text-secondary max-w-2xl mx-auto">
            Join families who've already transformed their memories
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="card-clean p-8 text-center">
              <p className="text-secondary mb-6 italic leading-relaxed">
                {testimonial.content}
              </p>
              <div className="border-t border-light-border pt-4">
                <h4 className="text-primary font-semibold">{testimonial.name}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <div className="flex justify-center items-center gap-1 mb-3">
            {[1,2,3,4,5].map((star) => (
              <span key={star} className="text-accent-coral text-2xl">★</span>
            ))}
          </div>
          <p className="text-secondary text-lg font-medium">
            Loved by families worldwide
          </p>
        </div>
              </div>
      </section>
    )
  } 