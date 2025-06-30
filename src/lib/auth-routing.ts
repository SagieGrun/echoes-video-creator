import { createServerClient } from '@supabase/ssr'

export async function determinePostLoginRoute(
  userId: string, 
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  // SIMPLIFIED: Always route to dashboard, let the dashboard handle tabs
  console.log('Routing user to dashboard (unified interface)')
  return '/dashboard'
} 