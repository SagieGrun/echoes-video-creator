import { AdminAuth } from '@/components/admin/AdminAuth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminAuth>
        <div className="flex">
          {/* Sidebar Navigation */}
          <nav className="w-64 bg-white shadow-lg min-h-screen">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-8">
                Echoes Admin
              </h1>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/admin"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/prompts"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Prompt Config
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/music"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Music
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/social"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Social Sharing
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/models"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Model Toggle
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/credits"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Credit Packs
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/stats"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Stats
                  </a>
                </li>
              </ul>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </AdminAuth>
    </div>
  )
} 