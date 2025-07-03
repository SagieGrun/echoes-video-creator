/**
 * Admin API Client
 * Provides authenticated fetch functions for admin API endpoints
 */

export interface AdminFetchOptions extends RequestInit {
  // Additional options can be added here
}

/**
 * Get admin session token from sessionStorage
 */
function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null // Server-side, no sessionStorage
  }
  
  return sessionStorage.getItem('admin_session_token')
}

/**
 * Authenticated fetch for admin API endpoints
 * Automatically includes admin authentication headers
 */
export async function adminFetch(url: string, options: AdminFetchOptions = {}): Promise<Response> {
  const sessionToken = getAdminSessionToken()
  
  // Prepare headers with authentication
  const headers = new Headers(options.headers)
  
  // Only set JSON Content-Type if not FormData
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  
  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`)
    headers.set('X-Admin-Session', sessionToken)
  }
  
  // Make the authenticated request
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  // Handle authentication errors
  if (response.status === 401) {
    // Clear invalid session and redirect to login
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_authenticated')
      sessionStorage.removeItem('admin_session_token')
      window.location.reload() // This will trigger AdminAuth to show login
    }
    throw new Error('Admin session expired. Please log in again.')
  }
  
  return response
}

/**
 * Convenience methods for common HTTP operations
 */
export const adminApi = {
  get: (url: string, options: AdminFetchOptions = {}) => 
    adminFetch(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options: AdminFetchOptions = {}) =>
    adminFetch(url, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined)
    }),
    
  put: (url: string, data?: any, options: AdminFetchOptions = {}) =>
    adminFetch(url, {
      ...options,
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined
    }),
    
  delete: (url: string, options: AdminFetchOptions = {}) =>
    adminFetch(url, { ...options, method: 'DELETE' })
}

/**
 * Check if user has valid admin session
 */
export function hasValidAdminSession(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  
  const isAuthenticated = sessionStorage.getItem('admin_authenticated') === 'true'
  const hasToken = !!sessionStorage.getItem('admin_session_token')
  
  return isAuthenticated && hasToken
} 