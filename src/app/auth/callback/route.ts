import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

  console.log('Session exchange successful, redirecting to create page')
  const isDevelopment = process.env.NODE_ENV === 'development'
  const redirectUrl = isDevelopment 
    ? new URL('/create', request.url)
    : 'https://app.get-echoes.com'
  
  return NextResponse.redirect(redirectUrl)
} 