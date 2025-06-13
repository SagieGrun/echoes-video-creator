import { supabase } from '@/lib/supabase'

async function getDetailedStats() {
  // Get user registrations by date
  const { data: userRegistrations } = await supabase
    .from('users')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  // Get project completion rates
  const { data: projects } = await supabase
    .from('projects')
    .select('status, created_at')

  // Get credit usage analytics
  const { data: creditTransactions } = await supabase
    .from('credit_transactions')
    .select('amount, type, created_at')
    .order('created_at', { ascending: false })

  // Get clip generation success rates
  const { data: clips } = await supabase
    .from('clips')
    .select('status, created_at')

  // Process the data
  const totalUsers = userRegistrations?.length || 0
  const totalProjects = projects?.length || 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
  const totalClips = clips?.length || 0
  const successfulClips = clips?.filter(c => c.status === 'completed').length || 0

  const totalCreditsUsed = creditTransactions?.reduce((sum, t) => {
    return sum + (t.amount < 0 ? Math.abs(t.amount) : 0)
  }, 0) || 0

  const totalCreditsPurchased = creditTransactions?.reduce((sum, t) => {
    return sum + (t.amount > 0 ? t.amount : 0)
  }, 0) || 0

  const revenue = creditTransactions?.reduce((sum, t) => {
    if (t.type === 'purchase' && t.amount > 0) {
      // Assume average price of $2.50 per credit
      return sum + (t.amount * 2.5)
    }
    return sum
  }, 0) || 0

  return {
    totalUsers,
    totalProjects,
    completedProjects,
    totalClips,
    successfulClips,
    totalCreditsUsed,
    totalCreditsPurchased,
    revenue,
    completionRate: totalProjects > 0 ? ((completedProjects / totalProjects) * 100).toFixed(1) : '0',
    successRate: totalClips > 0 ? ((successfulClips / totalClips) * 100).toFixed(1) : '0',
    userRegistrations,
    creditTransactions: creditTransactions?.slice(0, 10) || [],
  }
}

export default async function StatsPage() {
  const stats = await getDetailedStats()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Detailed platform statistics and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Project Completion</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clip Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credit Utilization</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCreditsPurchased > 0 ? 
                  ((stats.totalCreditsUsed / stats.totalCreditsPurchased) * 100).toFixed(1) : '0'}%
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent User Registrations */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent User Registrations</h2>
          </div>
                     <div className="p-6">
             {stats.userRegistrations && stats.userRegistrations.length > 0 ? (
               <div className="space-y-3">
                 {stats.userRegistrations.slice(0, 10).map((user, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">User {index + 1}</span>
                    <span className="text-gray-900">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No user registrations yet</p>
            )}
          </div>
        </div>

        {/* Recent Credit Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Credit Transactions</h2>
          </div>
          <div className="p-6">
            {stats.creditTransactions.length > 0 ? (
              <div className="space-y-3">
                {stats.creditTransactions.map((transaction, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.amount > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type}
                      </span>
                      <span className="text-gray-900">
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount} credits
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">No credit transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">System Health</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalProjects}</div>
              <div className="text-sm text-gray-600">Total Projects</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">{stats.totalClips}</div>
              <div className="text-sm text-gray-600">Total Clips</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 