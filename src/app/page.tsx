export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-primary-900">
            Echoes
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-12 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Bring Your Old Photos
            <span className="text-primary-500 block">
              to Life
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform your precious memories into magical animated videos. 
            Perfect for creating heartfelt gifts that will bring tears of joy.
          </p>

          <button className="btn-primary text-lg px-8 py-4 mb-4">
            Try Your Free Animated Clip
          </button>
          
          <p className="text-sm text-gray-500">
            No signup required to start
          </p>
        </div>
      </section>

      {/* Features Preview */}
      <section className="px-4 py-12 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Upload Photos</h3>
              <p className="text-gray-600">
                Simply drag and drop your favorite memories
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Magic</h3>
              <p className="text-gray-600">
                Watch as AI brings your photos to life with gentle animation
              </p>
            </div>
            
            <div className="p-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎬</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create Videos</h3>
              <p className="text-gray-600">
                Compile your animated memories into beautiful videos with music
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-gray-600">
        <p>&copy; 2024 Echoes. Bringing memories to life.</p>
      </footer>
    </div>
  )
}
