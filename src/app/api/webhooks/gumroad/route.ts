import { NextRequest, NextResponse } from 'next/server'
import { supabaseServiceRole } from '@/lib/supabase-server'

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

    // Fetch credit packs from admin panel to get dynamic credit amounts
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Fetching credit packs from admin panel`)
    const { data: configData, error: configError } = await supabaseServiceRole
      .from('admin_config')
      .select('value')
      .eq('key', 'credit_packs')
      .single()

    if (configError && configError.code !== 'PGRST116') {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Failed to fetch credit packs:`, configError)
      return NextResponse.json({ error: 'Failed to fetch credit configuration' }, { status: 500 })
    }

    // Get credit packs with fallback to defaults
    const creditPacks = configData?.value?.packs || [
      { id: '1', credits: 5 },   // hwllt fallback
      { id: '2', credits: 20 },  // zqbix fallback  
      { id: '3', credits: 40 }   // nyoppm fallback
    ]

    // Map Gumroad permalinks to admin pack IDs
    const permalinkToPackId: Record<string, string> = {
      'hwllt': '1',     // Starter Package
      'zqbix': '2',     // Social Pack  
      'nyoppm': '3'     // Legacy Pack
    }

    // Find the credit pack for this purchase
    const packId = permalinkToPackId[webhookData.short_product_id!]
    const creditPack = creditPacks.find((pack: any) => pack.id === packId)
    const credits = creditPack?.credits

    console.log(`[GUMROAD-WEBHOOK-${requestId}] Product '${webhookData.short_product_id}' → Pack ID '${packId}' → ${credits} credits`)

    if (!credits || !packId) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Unknown product ID or inactive pack: ${webhookData.short_product_id}`)
      return NextResponse.json({ error: 'Unknown product or inactive pack' }, { status: 400 })
    }
    
    // Find user by email
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Looking up user with email: ${webhookData.email}`)
    const { data: user, error: userError } = await supabaseServiceRole
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
    const { data: existingPayment } = await supabaseServiceRole
      .from('payments')
      .select('id, status')
      .eq('gumroad_sale_id', webhookData.sale_id)
      .single()
    
    if (existingPayment) {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Payment already processed:`, existingPayment)
      return NextResponse.json({ success: true, message: 'Already processed' })
    }
    
    // Add credits to user
    let newCreditBalance = user.credit_balance + credits
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Updating user credits: ${user.credit_balance} + ${credits} = ${newCreditBalance}`)
    
    const { error: updateError } = await supabaseServiceRole
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
    
    const { data: paymentRecord, error: paymentError } = await supabaseServiceRole
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
    
    const { data: transactionRecord, error: transactionError } = await supabaseServiceRole
      .from('credit_transactions')
      .insert(transactionData)
      .select()
      .single()
    
    if (transactionError) {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Failed to create transaction record:`, transactionError)
      throw transactionError
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Created transaction record:`, transactionRecord)
    
    // === PLG REFERRAL REWARD PROCESSING ===
    console.log(`[GUMROAD-WEBHOOK-${requestId}] === CHECKING FOR REFERRAL REWARDS ===`)
    
    // Check if this user was referred by someone
    const { data: referralData, error: referralError } = await supabaseServiceRole
      .from('referrals')
      .select('id, referrer_id, reward_granted')
      .eq('referred_id', user.id)
      .eq('reward_granted', false)
      .single()
    
    if (referralError && referralError.code !== 'PGRST116') {
      console.error(`[GUMROAD-WEBHOOK-${requestId}] Error checking referrals:`, referralError)
      // Don't fail the whole webhook for referral errors, just log and continue
    } else if (referralData) {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] Found unrewarded referral:`, referralData)
      
      // Check if this is the user's first purchase
      const { data: previousPurchases, error: purchaseError } = await supabaseServiceRole
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .neq('gumroad_sale_id', webhookData.sale_id) // Exclude current purchase
      
      if (purchaseError) {
        console.error(`[GUMROAD-WEBHOOK-${requestId}] Error checking previous purchases:`, purchaseError)
      } else {
        const isFirstPurchase = !previousPurchases || previousPurchases.length === 0
        console.log(`[GUMROAD-WEBHOOK-${requestId}] Is first purchase: ${isFirstPurchase}`)
        
        if (isFirstPurchase) {
          // Get PLG settings for referral reward amount
          const { data: plgSettings, error: plgError } = await supabaseServiceRole
            .from('admin_config')
            .select('value')
            .eq('key', 'plg_settings')
            .single()
          
          const referralCredits = plgSettings?.value?.referral_reward_credits || 5
          console.log(`[GUMROAD-WEBHOOK-${requestId}] Referral reward credits: ${referralCredits}`)
          
          // Get referrer user details
          const { data: referrerUser, error: referrerError } = await supabaseServiceRole
            .from('users')
            .select('id, email, credit_balance')
            .eq('id', referralData.referrer_id)
            .single()
          
          if (referrerError || !referrerUser) {
            console.error(`[GUMROAD-WEBHOOK-${requestId}] Referrer user not found:`, referrerError)
          } else {
            console.log(`[GUMROAD-WEBHOOK-${requestId}] Found referrer:`, { 
              id: referrerUser.id, 
              email: referrerUser.email, 
              current_credits: referrerUser.credit_balance 
            })
            
            try {
              // Award credits to referrer
              const referrerNewBalance = referrerUser.credit_balance + referralCredits
              const { error: referrerUpdateError } = await supabaseServiceRole
                .from('users')
                .update({ credit_balance: referrerNewBalance })
                .eq('id', referrerUser.id)
              
              if (referrerUpdateError) {
                throw new Error(`Failed to update referrer credits: ${referrerUpdateError.message}`)
              }
              
              console.log(`[GUMROAD-WEBHOOK-${requestId}] Updated referrer credits: ${referrerUser.credit_balance} + ${referralCredits} = ${referrerNewBalance}`)
              
              // Award credits to referred user (current user)
              const referredNewBalance = newCreditBalance + referralCredits
              const { error: referredUpdateError } = await supabaseServiceRole
                .from('users')
                .update({ credit_balance: referredNewBalance })
                .eq('id', user.id)
              
              if (referredUpdateError) {
                throw new Error(`Failed to update referred user credits: ${referredUpdateError.message}`)
              }
              
              console.log(`[GUMROAD-WEBHOOK-${requestId}] Updated referred user credits: ${newCreditBalance} + ${referralCredits} = ${referredNewBalance}`)
              
              // Create referral credit transactions for both users
              const referralTransactions = [
                {
                  user_id: referrerUser.id,
                  amount: referralCredits,
                  type: 'referral',
                  reference_id: `referral-${referralData.id}-${webhookData.sale_id}`
                },
                {
                  user_id: user.id,
                  amount: referralCredits,
                  type: 'referral_bonus',
                  reference_id: `referral-bonus-${referralData.id}-${webhookData.sale_id}`
                }
              ]
              
              const { error: transactionInsertError } = await supabaseServiceRole
                .from('credit_transactions')
                .insert(referralTransactions)
              
              if (transactionInsertError) {
                throw new Error(`Failed to create referral transactions: ${transactionInsertError.message}`)
              }
              
              console.log(`[GUMROAD-WEBHOOK-${requestId}] Created referral transactions for both users`)
              
              // Mark referral as rewarded
              const { error: markRewardedError } = await supabaseServiceRole
                .from('referrals')
                .update({ reward_granted: true })
                .eq('id', referralData.id)
              
              if (markRewardedError) {
                throw new Error(`Failed to mark referral as rewarded: ${markRewardedError.message}`)
              }
              
              console.log(`[GUMROAD-WEBHOOK-${requestId}] === REFERRAL REWARDS PROCESSED SUCCESSFULLY ===`)
              console.log(`[GUMROAD-WEBHOOK-${requestId}] Referrer (${referrerUser.email}): +${referralCredits} credits (${referrerNewBalance} total)`)
              console.log(`[GUMROAD-WEBHOOK-${requestId}] Referred (${user.email}): +${referralCredits} bonus credits (${referredNewBalance} total)`)
              
              // Update the newCreditBalance for final summary
              newCreditBalance = referredNewBalance
              
            } catch (referralRewardError) {
              console.error(`[GUMROAD-WEBHOOK-${requestId}] Error processing referral rewards:`, referralRewardError)
              // Don't fail the whole webhook for referral processing errors
            }
          }
        } else {
          console.log(`[GUMROAD-WEBHOOK-${requestId}] Not first purchase - no referral rewards`)
        }
      }
    } else {
      console.log(`[GUMROAD-WEBHOOK-${requestId}] No unrewarded referral found for this user`)
    }
    
    console.log(`[GUMROAD-WEBHOOK-${requestId}] === WEBHOOK COMPLETED SUCCESSFULLY ===`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}] Summary:`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   User: ${user.email} (${user.id})`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   Product: ${webhookData.product_name} (${webhookData.short_product_id})`)
    console.log(`[GUMROAD-WEBHOOK-${requestId}]   Pack: ${creditPack?.name || 'Unknown'} (ID: ${packId})`)
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