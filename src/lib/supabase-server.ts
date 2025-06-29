import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service role client (server-only, for webhooks and admin operations)
export const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceKey) 