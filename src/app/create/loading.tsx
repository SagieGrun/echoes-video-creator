export default function Loading() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-8 animate-pulse" />
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
                <div className="h-6 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
                <div className="h-10 bg-gray-200 rounded w-32 mx-auto animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-48 mx-auto animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
} 