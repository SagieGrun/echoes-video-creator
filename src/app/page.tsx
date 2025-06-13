import { Header } from '@/components/landing/Header'
import { HeroSection } from '@/components/landing/HeroSection'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ExampleGallery } from '@/components/landing/ExampleGallery'
import { PricingSection } from '@/components/landing/PricingSection'
import { TestimonialSection } from '@/components/landing/TestimonialSection'
import { TrustBadges } from '@/components/landing/TrustBadges'
import { CTASection } from '@/components/landing/CTASection'
import { Footer } from '@/components/landing/Footer'

export default function Homepage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-orange-200 via-rose-200 to-purple-200">
        <HeroSection />
        <HowItWorks />
        <ExampleGallery />
        <PricingSection />
        <TestimonialSection />
        <TrustBadges />
        <CTASection />
        <Footer />
      </main>
    </>
  )
}
