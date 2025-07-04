export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-soft pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-light-border p-8 md:p-12">
          <h1 className="text-4xl font-bold text-primary mb-6">Privacy Policy</h1>
          <p className="text-secondary mb-8">Last updated: December 2024</p>
          
          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">1. Information We Collect</h2>
              <p className="text-secondary mb-4">
                We collect information you provide directly to us, such as when you create an account, 
                upload photos, or contact us for support.
              </p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Account information (email address, name)</li>
                <li>Photos and images you upload for video creation</li>
                <li>Payment information (processed securely through third-party providers)</li>
                <li>Communication preferences and support inquiries</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">2. How We Use Your Information</h2>
              <p className="text-secondary mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Provide, maintain, and improve our video creation services</li>
                <li>Process your photos to create animated videos</li>
                <li>Send you technical notices and support messages</li>
                <li>Process payments and send billing information</li>
                <li>Respond to your comments and questions</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">3. Information Sharing</h2>
              <p className="text-secondary mb-4">
                We do not sell, trade, or rent your personal information to third parties. 
                We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>With your consent</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>With service providers who assist in our operations (under strict confidentiality)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">4. Data Security</h2>
              <p className="text-secondary mb-4">
                We implement appropriate technical and organizational measures to protect your personal 
                information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">5. Data Retention</h2>
              <p className="text-secondary mb-4">
                We retain your personal information only for as long as necessary to provide our services 
                and fulfill the purposes outlined in this privacy policy, unless a longer retention period 
                is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">6. Your Rights</h2>
              <p className="text-secondary mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-secondary space-y-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">7. Cookies and Tracking</h2>
              <p className="text-secondary mb-4">
                We use cookies and similar tracking technologies to improve your experience, 
                analyze usage patterns, and personalize content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">8. Children's Privacy</h2>
              <p className="text-secondary mb-4">
                Our service is not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">9. Changes to This Policy</h2>
              <p className="text-secondary mb-4">
                We may update this privacy policy from time to time. We will notify you of any 
                material changes by posting the new policy on this page.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-primary mb-4">10. Contact Us</h2>
              <p className="text-secondary mb-4">
                If you have any questions about this privacy policy, please contact us at:
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