import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Check the current user's profile status
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No authenticated user found' 
      }, { status: 401 })
    }
    
    // Check if user profile exists in our users table (same query as auth callback)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, credit_balance, referral_code, created_at')
      .eq('id', user.id)
      .single()
    
    console.log('👤 User profile check:', {
      userId: user.id,
      email: user.email,
      existingUser,
      fetchError: fetchError ? {
        code: fetchError.code,
        message: fetchError.message,
        details: fetchError.details
      } : null
    })
    
    // Also check recent users to see if there are duplicates
    const { data: recentUsers, error: recentUsersError } = await supabase
      .from('users')
      .select('id, email, credit_balance, referral_code, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      success: true,
      currentUser: {
        id: user.id,
        email: user.email,
        authCreatedAt: user.created_at
      },
      profileCheck: {
        exists: !!existingUser,
        data: existingUser,
        error: fetchError ? {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint
        } : null
      },
      recentUsers: {
        data: recentUsers,
        error: recentUsersError?.message
      }
    })
    
  } catch (error) {
    console.error('User profile check error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 