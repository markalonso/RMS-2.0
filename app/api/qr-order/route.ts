import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Function to create Supabase client with service role for server-side operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// In-memory rate limit store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const requestIdStore = new Map<string, number>() // Store timestamp with request ID

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  const expiry = 5 * 60 * 1000 // 5 minutes
  
  // Clean up rate limits
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
  
  // Clean up old request IDs
  for (const [requestId, timestamp] of requestIdStore.entries()) {
    if (timestamp < now - expiry) {
      requestIdStore.delete(requestId)
    }
  }
}, 5 * 60 * 1000)

function getRateLimitKey(ip: string, tableNumber: string): string {
  return `${ip}:${tableNumber}`
}

function checkRateLimit(ip: string, tableNumber: string): boolean {
  const key = getRateLimitKey(ip, tableNumber)
  const now = Date.now()
  const limit = 3 // max 3 requests
  const window = 60 * 1000 // per minute

  const current = rateLimitStore.get(key)
  
  if (!current || current.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + window })
    return true
  }

  if (current.count >= limit) {
    return false
  }

  current.count++
  return true
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Parse request body
    const body = await request.json()
    const { tableNumber, items, clientRequestId } = body

    // Validate required fields
    if (!tableNumber || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Invalid request: tableNumber and items are required' },
        { status: 400 }
      )
    }

    // Check for duplicate request ID
    if (clientRequestId) {
      if (requestIdStore.has(clientRequestId)) {
        return NextResponse.json(
          { error: 'Duplicate request' },
          { status: 409 }
        )
      }
      requestIdStore.set(clientRequestId, Date.now())
    }

    // Check rate limit
    if (!checkRateLimit(ip, tableNumber)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before submitting another order.' },
        { status: 429 }
      )
    }

    // Validate items count
    if (items.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 items per order' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity < 1 || item.quantity > 20) {
        return NextResponse.json(
          { error: 'Invalid item: each item must have menu_item_id and quantity between 1-20' },
          { status: 400 }
        )
      }
    }

    // Verify table exists, is active, and has QR enabled
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, qr_enabled, is_active')
      .eq('table_number', tableNumber)
      .eq('is_deleted', false)
      .single()

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    if (!table.is_active) {
      return NextResponse.json(
        { error: 'Table is not active' },
        { status: 400 }
      )
    }

    if (!table.qr_enabled) {
      return NextResponse.json(
        { error: 'QR ordering is not enabled for this table' },
        { status: 400 }
      )
    }

    // Check for active session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, business_day_id')
      .eq('table_id', table.id)
      .eq('status', 'active')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active session for this table. Please contact staff.' },
        { status: 400 }
      )
    }

    // Generate order number (UUID-like with timestamp and random component)
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substring(2, 9).toUpperCase()
    const orderNumber = `QR-${timestamp}-${random}`

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        session_id: session.id,
        business_day_id: session.business_day_id,
        order_number: orderNumber,
        source: 'qr',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Get menu item prices
    const menuItemIds = items.map((item: any) => item.menu_item_id)
    const { data: menuItemsData } = await supabaseAdmin
      .from('menu_items')
      .select('id, price')
      .in('id', menuItemIds)

    const priceMap = new Map(menuItemsData?.map(item => [item.id, item.price]) || [])

    // Create order items
    const orderItemsToInsert = items.map((item: any) => {
      const unitPrice = priceMap.get(item.menu_item_id) || 0
      return {
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
        notes: item.notes || null
      }
    })

    const { data: createdItems, error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert)
      .select()

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Rollback: delete the order
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      )
    }

    // Create order item modifiers if provided
    const modifiersToInsert: any[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const orderItem = createdItems?.[i]
      
      if (orderItem && item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0) {
        for (const modifierId of item.modifiers) {
          modifiersToInsert.push({
            order_item_id: orderItem.id,
            modifier_id: modifierId
          })
        }
      }
    }

    if (modifiersToInsert.length > 0) {
      await supabaseAdmin
        .from('order_item_modifiers')
        .insert(modifiersToInsert)
    }

    // Log the action
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        action: 'qr_order_submitted',
        table_name: 'orders',
        record_id: order.id,
        details: {
          order_number: orderNumber,
          table_number: tableNumber,
          items_count: items.length,
          ip_address: ip
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Order submitted successfully. Waiting for staff approval.',
      orderNumber
    })

  } catch (error: any) {
    console.error('QR order API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
