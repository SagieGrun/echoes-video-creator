import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    console.log(`[DEBUG] Checking credits for email: ${email}`)

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, credit_balance, created_at')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found',
        details: userError 
      }, { status: 404 })
    }

    // Get recent payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get recent credit transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get all payments for this email (in case there are duplicates)
    const { data: allPayments, error: allPaymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('buyer_email', email)
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        credit_balance: user.credit_balance,
        created_at: user.created_at
      },
      payments: payments || [],
      transactions: transactions || [],
      allPaymentsByEmail: allPayments || [],
      errors: {
        payments: paymentsError,
        transactions: transactionsError,
        allPayments: allPaymentsError
      },
      webhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}/api/webhooks/gumroad`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DEBUG] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 