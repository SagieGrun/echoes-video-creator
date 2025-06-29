import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, product_permalink, test_mode = true } = await request.json()
    
    if (!email || !product_permalink) {
      return NextResponse.json({ 
        error: 'Email and product_permalink required' 
      }, { status: 400 })
    }

    console.log(`[WEBHOOK-TEST] Testing webhook for email: ${email}, product: ${product_permalink}`)

    // Map product permalink to credits (same as real webhook)
    const creditMap: Record<string, number> = {
      'hwllt': 5,      // Echoes Starter Package - $15
      'zqbix': 20,     // Echoes Social Pack - $45
      'nyoppm': 40     // Echoes Legacy Pack - $80
    }

    const credits = creditMap[product_permalink]
    
    if (!credits) {
      return NextResponse.json({ 
        error: `Unknown product permalink: ${product_permalink}. Valid options: ${Object.keys(creditMap).join(', ')}` 
      }, { status: 400 })
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credit_balance, email')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ 
        error: 'User not found',
        details: userError,
        suggestion: 'Make sure you have an account with this email address'
      }, { status: 404 })
    }

    const originalBalance = user.credit_balance
    const newBalance = originalBalance + credits

    // Update user credits
    const { error: updateError } = await supabase
      .from('users')
      .update({ credit_balance: newBalance })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update credits',
        details: updateError 
      }, { status: 500 })
    }

    // Create test payment record
    const testSaleId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const paymentData = {
      user_id: user.id,
      gumroad_sale_id: testSaleId,
      gumroad_product_id: 'test-product-id',
      gumroad_product_permalink: product_permalink,
      gumroad_order_number: Math.floor(Math.random() * 100000),
      buyer_email: email,
      credits_purchased: credits,
      amount_cents: credits === 5 ? 1500 : credits === 20 ? 4500 : 8000,
      status: test_mode ? 'test' : 'completed'
    }

    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()

    // Create test transaction record
    const transactionData = {
      user_id: user.id,
      amount: credits,
      type: 'purchase',
      reference_id: testSaleId
    }

    const { data: transactionRecord, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionData)
      .select()
      .single()

    return NextResponse.json({
      success: true,
      message: 'Test webhook completed successfully',
      details: {
        user: {
          id: user.id,
          email: user.email,
          credits_before: originalBalance,
          credits_after: newBalance,
          credits_added: credits
        },
        product: {
          permalink: product_permalink,
          credits: credits
        },
        records: {
          payment: paymentRecord,
          transaction: transactionRecord
        },
        errors: {
          payment: paymentError,
          transaction: transactionError
        },
        test_mode: test_mode,
        sale_id: testSaleId
      }
    })

  } catch (error) {
    console.error('[WEBHOOK-TEST] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 