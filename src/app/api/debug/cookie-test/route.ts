import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    // Get all cookies
    const allCookies = Array.from(cookieStore.getAll())
    
    // Check specifically for referral cookie
    const referralCookie = cookieStore.get('referral_code')
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      totalCookies: allCookies.length,
      allCookies: allCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        hasValue: !!cookie.value
      })),
      referralCookie: {
        exists: !!referralCookie,
        value: referralCookie?.value || null
      }
    }
    
    console.log('🍪 COOKIE DEBUG:', JSON.stringify(debugInfo, null, 2))
    
    return NextResponse.json({
      success: true,
      ...debugInfo
    })
    
  } catch (error) {
    console.error('Cookie debug error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 