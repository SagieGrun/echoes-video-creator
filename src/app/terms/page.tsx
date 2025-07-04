export default function TermsPage() {
  return (
    <div className="min-h-screen bg-soft pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-light-border p-8 md:p-12">
          <h1 className="text-4xl font-bold text-primary mb-6">Terms of Use</h1>
          <p className="text-secondary mb-8">Last updated: December 2024</p>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">1. Acceptance of Terms</h2>
              <p className="text-secondary mb-4">
                By accessing and using Echoes, you accept and agree to be bound by the terms and 
                provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">2. Description of Service</h2>
              <p className="text-secondary mb-4">
                Echoes is an AI-powered video creation platform that allows users to transform static photos 
                into animated videos. Our service uses artificial intelligence to create motion from still images.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">3. User Accounts</h2>
              <p className="text-secondary mb-4">
                To use our service, you must register for an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access</li>
                <li>Providing accurate and complete information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">4. Acceptable Use</h2>
              <p className="text-secondary mb-4">You agree not to use the service to:</p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Upload content that violates any laws or regulations</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Upload inappropriate, offensive, or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the service for any commercial purpose without permission</li>
                <li>Upload content containing minors without proper consent</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">5. Content Ownership and License</h2>
              <p className="text-secondary mb-4">
                You retain ownership of the photos you upload. By using our service, you grant us a 
                limited license to process your images to create videos. We do not claim ownership 
                of your content and will not use it for any purpose other than providing our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">6. Payment Terms</h2>
              <p className="text-secondary mb-4">
                Our service operates on a credit-based system. By purchasing credits, you agree to:
              </p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Pay all fees associated with your account</li>
                <li>Provide accurate billing information</li>
                <li>Understand that credits are non-refundable unless required by law</li>
                <li>Accept that pricing may change with notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">7. Service Availability</h2>
              <p className="text-secondary mb-4">
                We strive to provide reliable service but cannot guarantee 100% uptime. We reserve the 
                right to modify, suspend, or discontinue the service at any time with or without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">8. Privacy</h2>
              <p className="text-secondary mb-4">
                Your privacy is important to us. Please review our Privacy Policy to understand how we 
                collect, use, and protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">9. Disclaimers</h2>
              <p className="text-secondary mb-4">
                The service is provided "as is" without any warranties. We do not guarantee the accuracy, 
                completeness, or quality of the AI-generated content. Use of the service is at your own risk.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">10. Limitation of Liability</h2>
              <p className="text-secondary mb-4">
                In no event shall Echoes be liable for any indirect, incidental, special, consequential, 
                or punitive damages arising out of your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">11. Termination</h2>
              <p className="text-secondary mb-4">
                We may terminate or suspend your account at any time for violation of these terms. 
                You may terminate your account at any time by contacting us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">12. Changes to Terms</h2>
              <p className="text-secondary mb-4">
                We reserve the right to modify these terms at any time. Changes will be effective 
                immediately upon posting. Continued use of the service constitutes acceptance of new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">13. Governing Law</h2>
              <p className="text-secondary mb-4">
                These terms shall be governed by and construed in accordance with the laws of Delaware, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">14. Contact Information</h2>
              <p className="text-secondary mb-4">
                If you have any questions about these terms, please contact us at:
              </p>
              <p className="text-secondary">
                Email: sagie@your-echoes.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 