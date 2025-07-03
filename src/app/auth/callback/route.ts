import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { determinePostLoginRoute } from '@/lib/auth-routing'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

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

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('🔥 Auth exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
    }

    if (!data.user) {
      console.error('🔥 No user in auth response')
      return NextResponse.redirect(new URL('/login?error=no_user', request.url))
    }

    console.log('🔥 Auth successful for user:', data.user.id, data.user.email)
    
    // Get referral cookie BEFORE any processing
    const referralCookie = cookieStore.get('referral_code')
    const referralCode = referralCookie?.value
    
    console.log('🔥 Referral cookie found:', referralCode)
    
    // Check if user profile exists (created by database trigger)
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, created_at, credit_balance')
      .eq('id', data.user.id)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist - database trigger failed, create manually
      console.log('🔥 Database trigger failed, creating user manually')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email!,
            credit_balance: 1,
            referral_code: Math.random().toString(36).substring(2, 10) // 8-char code
          }
        ])
        .select()
        .single()
      
      if (createError) {
        console.error('🔥 Manual user creation failed:', createError)
        return NextResponse.redirect(new URL('/login?error=profile_creation_failed', request.url))
      }
      
      console.log('🔥 User created manually:', newUser)
      
      // Process referral for newly created user
      if (referralCode) {
        await processReferralSignup(supabase, data.user.id, referralCode, cookieStore)
      }
      
    } else if (fetchError) {
      // Some other fetch error occurred
      console.error('🔥 Error fetching user profile:', fetchError)
      return NextResponse.redirect(new URL('/login?error=profile_fetch_failed', request.url))
      
    } else if (existingUser) {
      // User exists (database trigger worked)
      console.log('🔥 User exists:', existingUser)
      
      // Check if this is a recent signup (within 5 minutes to be more lenient)
      const now = new Date()
      const userCreated = new Date(existingUser.created_at)
      const timeDiff = now.getTime() - userCreated.getTime()
      const isRecentSignup = timeDiff < 5 * 60 * 1000 // 5 minutes
      
      console.log('🔥 User created:', userCreated)
      console.log('🔥 Time difference:', timeDiff, 'ms')
      console.log('🔥 Is recent signup:', isRecentSignup)
      
      // Process referral for recent signups
      if (isRecentSignup && referralCode) {
        await processReferralSignup(supabase, data.user.id, referralCode, cookieStore)
      } else if (referralCode) {
        console.log('🔥 Referral cookie found but user not recent signup, cleaning up cookie')
        // Clean up referral cookie for existing users
        cookieStore.set('referral_code', '', { 
          maxAge: 0, 
          path: '/',
          domain: process.env.NODE_ENV === 'production' ? '.echoes.video' : undefined
        })
      }
      
    } else {
      console.error('🔥 Unknown user state:', { fetchError, existingUser })
      return NextResponse.redirect(new URL('/login?error=unknown_user_state', request.url))
    }
    
    // Determine where to redirect user
    const redirectUrl = await determinePostLoginRoute(data.user.id, supabase)
    console.log('🔥 Redirecting to:', redirectUrl)
    
    return NextResponse.redirect(new URL(redirectUrl, request.url))
    
  } catch (error) {
    console.error('🔥 Auth callback error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }
}

async function processReferralSignup(
  supabase: any,
  userId: string,
  referralCode: string,
  cookieStore: any
) {
  console.log('🔥 Processing referral signup for user:', userId, 'with code:', referralCode)
  
  try {
    // Call the database function to process referral
    const { data: result, error } = await supabase.rpc('process_referral_signup', {
      new_user_id: userId,
      referrer_code: referralCode
    })
    
    if (error) {
      console.error('🔥 Referral processing error:', error)
      return
    }
    
    console.log('🔥 Referral processing result:', result)
    
    // Clean up referral cookie after successful processing
    cookieStore.set('referral_code', '', { 
      maxAge: 0, 
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.echoes.video' : undefined
    })
    
    console.log('🔥 Referral cookie cleaned up')
    
  } catch (error) {
    console.error('🔥 Error in referral processing:', error)
  }
} 