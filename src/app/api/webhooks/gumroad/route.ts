import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface GumroadWebhookData {
  sale_id: string
  sale_timestamp: string
  order_number: string
  seller_id: string
  product_id: string
  product_permalink: string
  short_product_id: string
  product_name: string
  email: string
  full_name?: string
  purchaser_id?: string
  price: string // in cents
  quantity: string
  refunded: string // 'true' or 'false'
  test?: string // 'true' for test purchases
  url_params?: any
}

export async function POST(request: NextRequest) {
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    console.log(`[GUMROAD-WEBHOOK-${requestId}] === WEBHOOK RECEIVED ===`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Request URL:`, request.url)
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Request method:`, request.method)
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Headers:`, Object.fromEntries(request.headers.entries()))
    
    // Parse form data (Gumroad sends x-www-form-urlencoded)
    const formData = await request.formData()
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Raw form data:`)
    // Convert FormData entries to array to avoid iteration issues
    const formEntries = Array.from(formData.entries())
    for (const [key, value] of formEntries) {
      console.log(`[GUMROAD-WEBHOOK-${requestId}]   ${key}: ${value}`)
    }
    
    // Extract webhook data
    const webhookData: Partial<GumroadWebhookData> = {}
    for (const [key, value] of formEntries) {
      webhookData[key as keyof GumroadWebhookData] = value as string
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Parsed webhook data:`, webhookData)
    
    // Validate required fields
    if (!webhookData.sale_id || !webhookData.email || !webhookData.short_product_id) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Missing required fields:`, {
        sale_id: !!webhookData.sale_id,
        email: !!webhookData.email,
        short_product_id: !!webhookData.short_product_id
      })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Process ALL purchases - test and real
    if (webhookData.test === 'true') {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Processing TEST purchase`)
    } else {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Processing REAL purchase`)
    }
    
    // Skip refunded purchases
    if (webhookData.refunded === 'true') {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Skipping refunded purchase`)
      return NextResponse.json({ success: true, message: 'Refunded purchase skipped' })
    }
    
    // Map product permalink to credits
    const creditMap: Record<string, number> = {
      'hwllt': 5,      // Echoes Starter Package - $15
      'zqbix': 20,     // Echoes Social Pack - $45
      'nyoppm': 40     // Echoes Legacy Pack - $80
    }
    
    const credits = creditMap[webhookData.short_product_id!]
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Product ID '${webhookData.short_product_id}' maps to ${credits} credits`)
    
    if (!credits) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Unknown product ID: ${webhookData.short_product_id}`)
      return NextResponse.json({ error: 'Unknown product' }, { status: 400 })
    }
    
    // Find user by email
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Looking up user with email: ${webhookData.email}`)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, credit_balance, email')
      .eq('email', webhookData.email)
      .single()
    
    if (userError || !user) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] User not found:`, userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Found user:`, { 
      id: user.id, 
      email: user.email, 
      current_credits: user.credit_balance 
    })
    
    // Check for duplicate processing
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Checking for duplicate sale_id: ${webhookData.sale_id}`)
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('gumroad_sale_id', webhookData.sale_id)
      .single()
    
    if (existingPayment) {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Payment already processed:`, existingPayment)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    
    // Add credits to user
    const newCreditBalance = user.credit_balance + credits
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Updating user credits: ${user.credit_balance} + ${credits} = ${newCreditBalance}`)
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ credit_balance: newCreditBalance })
      .eq('id', user.id)
    
    if (updateError) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Failed to update user credits:`, updateError)
      throw updateError
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Successfully updated user credits`)
    
    // Create payment record
    const paymentData = {
      user_id: user.id,
      gumroad_sale_id: webhookData.sale_id,
      gumroad_product_id: webhookData.product_id,
      gumroad_product_permalink: webhookData.short_product_id,
      gumroad_order_number: parseInt(webhookData.order_number || '0'),
      buyer_email: webhookData.email,
      credits_purchased: credits,
      amount_cents: parseInt(webhookData.price || '0'),
      status: 'completed'
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Creating payment record:`, paymentData)
    
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single()
    
    if (paymentError) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Failed to create payment record:`, paymentError)
      throw paymentError
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Created payment record:`, paymentRecord)
    
    // Create credit transaction
    const transactionData = {
      user_id: user.id,
      amount: credits,
      type: 'purchase',
      reference_id: webhookData.sale_id
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Creating credit transaction:`, transactionData)
    
    const { data: transactionRecord, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert(transactionData)
      .select()
      .single()
    
    if (transactionError) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Failed to create transaction record:`, transactionError)
      throw transactionError
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Created transaction record:`, transactionRecord)
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] === WEBHOOK COMPLETED SUCCESSFULLY ===`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Summary:`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   User: ${user.email} (${user.id})`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   Product: ${webhookData.product_name} (${webhookData.short_product_id})`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   Credits added: ${credits}`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   New balance: ${newCreditBalance}`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   Sale ID: ${webhookData.sale_id}`)
    
    return NextResponse.json({ 
      success: true,
      message: 'Credits added successfully',
      details: {
        user_id: user.id,
        credits_added: credits,
        new_balance: newCreditBalance,
        sale_id: webhookData.sale_id
      }
    })
    
  } catch (error) {
    console.error(`[GUMROAD-WEBHOOK-${requestId}] === WEBHOOK ERROR ===`)
    console.error(`[GUMROAD-WEBHOOK-${requestId}] Error details:`, error)
    console.error(`[GUMROAD-WEBHOOK-${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Internal server error',
      request_id: requestId
    }, { status: 500 })
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 