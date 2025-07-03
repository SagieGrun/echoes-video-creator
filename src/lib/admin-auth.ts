import { NextRequest } from 'next/server'

/**
 * Admin Authentication Utilities
 * Provides session verification for admin API endpoints
 */

export interface AdminSession {
  isAuthenticated: boolean
  sessionId?: string
}

/**
 * Verify admin session from request headers/cookies
 * This checks for the session token that's set by the frontend AdminAuth component
 */
export async function verifyAdminSession(request: NextRequest): Promise<AdminSession> {
  try {
    // Check for admin session in various places
    
    // 1. Check Authorization header (for API calls with explicit token)
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      if (await validateAdminToken(token)) {
        return { isAuthenticated: true, sessionId: token }
      }
    }
    
    // 2. Check X-Admin-Session header (custom header from frontend)
    const adminSession = request.headers.get('X-Admin-Session')
    if (adminSession && await validateAdminToken(adminSession)) {
      return { isAuthenticated: true, sessionId: adminSession }
    }
    
    // 3. Check cookies (for browser-based requests)
    const cookies = request.headers.get('cookie')
    if (cookies) {
      const adminCookie = extractAdminCookie(cookies)
      if (adminCookie && await validateAdminToken(adminCookie)) {
        return { isAuthenticated: true, sessionId: adminCookie }
      }
    }
    
    return { isAuthenticated: false }
  } catch (error) {
    console.error('Error verifying admin session:', error)
    return { isAuthenticated: false }
  }
}

/**
 * Validate admin token by checking against admin password
 * In production, this could be enhanced with proper JWT tokens or session store
 */
async function validateAdminToken(token: string): Promise<boolean> {
  try {
    // Get admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.error('ADMIN_PASSWORD environment variable not set')
      return false
    }
    
    // Validate token format: base64(admin:PASSWORD)
    const expectedToken = Buffer.from(`admin:${adminPassword}`).toString('base64')
    return token === expectedToken
    
  } catch (error) {
    console.error('Error validating admin token:', error)
    return false
  }
}

/**
 * Extract admin session cookie from cookie string
 */
function extractAdminCookie(cookieString: string): string | null {
  try {
    const cookies = cookieString.split(';').map(c => c.trim())
    for (const cookie of cookies) {
      if (cookie.startsWith('admin_session=')) {
        return cookie.split('=')[1]
      }
    }
    return null
  } catch (error) {
    return null
  }
}

/**
 * Create admin session token for API authentication
 * This can be called from the frontend after successful admin login
 */
export function createAdminSessionToken(): string {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    throw new Error('Admin password not configured')
  }
  
  // Create a simple session token - in production, use proper JWT
  return Buffer.from(`admin:${adminPassword}`).toString('base64')
}

/**
 * Middleware function to protect admin routes
 * Returns null if authenticated, or error response if not
 */
export async function requireAdminAuth(request: NextRequest) {
  const session = await verifyAdminSession(request)
  
  if (!session.isAuthenticated) {
    return new Response(
      JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Admin authentication required' 
      }),
      { 
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
  
  return null // No error, authentication successful
} 