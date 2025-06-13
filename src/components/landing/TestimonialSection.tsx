export function TestimonialSection() {
  const testimonials = [
    {
      quote: "Turned my grandpa's old photo into a memory that made me cry happy tears. My whole family was amazed!",
      author: "Sarah M.",
      role: "Mother of 3"
    },
    {
      quote: "The perfect gift for my mom's 70th birthday. She couldn't believe her wedding photo was moving!",
      author: "David L.",
      role: "Family Son"
    },
    {
      quote: "Brought our beloved dog back to life in the most beautiful way. Thank you for helping us remember him.",
      author: "Emily R.",
      role: "Pet Parent"
    }
  ]

  return (
    <section id="testimonials" className="py-20 px-4 bg-gradient-to-br from-rose-50 to-orange-50">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center items-center gap-1 mb-4">
            {[1,2,3,4,5].map((star) => (
              <span key={star} className="text-orange-400 text-2xl">★</span>
            ))}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-orange-800 mb-6">
            Loved by Families Worldwide
          </h2>
          <p className="text-xl text-rose-700">
            Join thousands of families creating magical memories
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white/80 rounded-2xl p-8 hover:shadow-lg transition-shadow duration-300 border border-rose-100">
              <div className="text-4xl text-orange-400 mb-4">"</div>
              <p className="text-rose-800 text-lg mb-6 leading-relaxed">
                {testimonial.quote}
              </p>
              <div className="border-t border-rose-200 pt-4">
                <p className="font-semibold text-orange-800">{testimonial.author}</p>
                <p className="text-rose-600 text-base">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
} 