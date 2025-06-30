import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { determinePostLoginRoute } from '@/lib/auth-routing'

export async function GET(request: Request) {
  console.log('🔥 AUTH CALLBACK RECEIVED')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('🔥 Auth callback params:', {
    hasCode: !!code,
    error,
    error_description
  })

  if (error || !code) {
    console.error('🔥 Auth callback error:', { error, error_description })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth-error`)
  }

  const cookieStore = cookies()
  
  // DEBUGGING: Check if referral cookie exists at this point
  const referralCookieCheck = cookieStore.get('referral_code')?.value
  console.log('🔥 REFERRAL COOKIE CHECK AT START:', referralCookieCheck)
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  console.log('🔥 Exchanging code for session...')
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (sessionError) {
    console.error('🔥 Session exchange error:', sessionError)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth-error`)
  }

  console.log('🔥 Session exchange successful, checking/creating user profile')
  
  // Get the user session to access user details
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    console.log('🔥 User found:', { id: user.id, email: user.email })
    
    // Check if user profile exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, credit_balance')
      .eq('id', user.id)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them with 1 free credit
      console.log('🔥🔥🔥 CREATING NEW USER PROFILE WITH 1 FREE CREDIT')
      
      // Check for referral cookie
      const referralCode = cookieStore.get('referral_code')?.value
      console.log('🔥🔥🔥 REFERRAL CODE FROM COOKIE:', referralCode)
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email || '',
          credit_balance: 1,
          referral_code: Math.random().toString(36).substring(2, 10).toUpperCase()
        })
        .select()
        .single()
      
      if (createError) {
        console.error('🔥🔥🔥 ERROR CREATING USER PROFILE:', createError)
      } else {
        console.log('🔥🔥🔥 USER PROFILE CREATED SUCCESSFULLY:', newUser)
        
        // Log the initial free credit transaction
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: 1,
            type: 'referral', // Using 'referral' type for signup bonus
            reference_id: 'signup_bonus'
          })
        
        // Process referral if cookie exists
        if (referralCode) {
          console.log('🔥🔥🔥 PROCESSING REFERRAL SIGNUP FOR CODE:', referralCode)
          try {
            // Simple referral processing (just self-referral prevention)
            console.log('🔥🔥🔥 CALLING process_referral_signup FUNCTION...')
            const { data: referralResult, error: referralError } = await supabase.rpc('process_referral_signup', {
              new_user_id: user.id,
              referrer_code: referralCode
            })
            
            if (referralError) {
              console.error('🔥🔥🔥 DATABASE ERROR PROCESSING REFERRAL:', referralError)
            } else if (referralResult) {
              console.log('🔥🔥🔥 REFERRAL PROCESSING RESULT:', referralResult)
              
              if (referralResult.success) {
                console.log('🔥🔥🔥 ✅ REFERRAL SIGNUP PROCESSED SUCCESSFULLY')
              } else {
                console.warn('🔥🔥🔥 ❌ REFERRAL SIGNUP BLOCKED:', referralResult.reason)
                
                // Only log self-referral attempts (simple abuse detection)
                if (referralResult.reason === 'self_referral_blocked') {
                  console.warn('🔥🔥🔥 Self-referral attempt blocked for user:', user.id)
                }
              }
            }
          } catch (referralError) {
            console.error('🔥🔥🔥 EXCEPTION PROCESSING REFERRAL SIGNUP:', referralError)
          }
        } else {
          console.log('🔥🔥🔥 NO REFERRAL CODE FOUND IN COOKIE')
        }
      }
    } else if (existingUser) {
      console.log('🔥 EXISTING USER FOUND:', existingUser)
    } else {
      console.error('🔥 ERROR FETCHING USER:', fetchError)
    }
  }
  
  // Determine where to redirect based on user's clip history
  let redirectPath = '/dashboard' // Updated default
  
  if (user) {
    console.log('🔥 Determining post-login route based on user clip history')
    redirectPath = await determinePostLoginRoute(user.id, supabase)
    console.log('🔥 Redirecting to:', redirectPath)
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development'
  const redirectUrl = isDevelopment 
    ? new URL(redirectPath, request.url)
    : `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}`
  
  console.log('🔥 FINAL REDIRECT URL:', redirectUrl.toString())
  return NextResponse.redirect(redirectUrl)
} 