import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { determinePostLoginRoute } from '@/lib/auth-routing'

export async function GET(request: Request) {
  console.log('Auth callback received')
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  console.log('Auth callback params:', {
    hasCode: !!code,
    error,
    error_description
  })

  if (error || !code) {
    console.error('Auth callback error:', { error, error_description })
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth-error`)
  }

  const cookieStore = cookies()
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

  console.log('Exchanging code for session...')
  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
  
  if (sessionError) {
    console.error('Session exchange error:', sessionError)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth-error`)
  }

  console.log('Session exchange successful, checking/creating user profile')
  
  // Get the user session to access user details
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    console.log('User found:', { id: user.id, email: user.email })
    
    // Check if user profile exists in our users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id, email, credit_balance')
      .eq('id', user.id)
      .single()
    
    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist, create them with 1 free credit
      console.log('Creating new user profile with 1 free credit')
      
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
        console.error('Error creating user profile:', createError)
      } else {
        console.log('User profile created successfully:', newUser)
        
        // Log the initial free credit transaction
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            amount: 1,
            type: 'referral', // Using 'referral' type for signup bonus
            reference_id: 'signup_bonus'
          })
      }
    } else if (existingUser) {
      console.log('Existing user found:', existingUser)
    } else {
      console.error('Error fetching user:', fetchError)
    }
  }
  
  // Determine where to redirect based on user's clip history
  let redirectPath = '/create' // Default fallback
  
  if (user) {
    console.log('Determining post-login route based on user clip history')
    redirectPath = await determinePostLoginRoute(user.id, supabase)
    console.log('Redirecting to:', redirectPath)
  }
  
  const isDevelopment = process.env.NODE_ENV === 'development'
  const redirectUrl = isDevelopment 
    ? new URL(redirectPath, request.url)
    : `https://app.get-echoes.com${redirectPath}`
  
  return NextResponse.redirect(redirectUrl)
} 