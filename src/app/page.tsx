import { Header } from '@/components/landing/Header'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ExampleGallery } from '@/components/landing/ExampleGallery'
import { WhatYouGet } from '@/components/landing/WhatYouGet'
import { PricingSection } from '@/components/landing/PricingSection'
import { TestimonialSection } from '@/components/landing/TestimonialSection'
import { TrustBadges } from '@/components/landing/TrustBadges'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'

export default function Homepage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-clean-white">
        <HeroSection />
        <HowItWorks />
        <ExampleGallery />
        <WhatYouGet />
        <PricingSection />
        <TestimonialSection />
        <TrustBadges />
        <CTASection />
        <Footer />
      </main>
    </>
  )
}
