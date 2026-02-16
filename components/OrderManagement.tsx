'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Session, MenuItem, Profile, Bill } from '@/types'
import { formatPrice } from '@/utils/helpers'
import { translate } from '@/lib/i18n'
import { Language } from '@/lib/i18n'

interface OrderItem {
  id?: string
  menu_item_id: string
  menu_item?: MenuItem
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

interface Order {
  id: string
  order_number: string
  session_id: string
  status: string
  source: string
  created_at: string
  order_items?: OrderItem[]
}

interface OrderManagementProps {
  session: Session
  currentUser: Profile | null
  language: Language
  onClose: () => void
  onUpdate: () => void
}

export default function OrderManagement({ 
  session, 
  currentUser, 
  language, 
  onClose, 
  onUpdate 
}: OrderManagementProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({})
  const [showAddItems, setShowAddItems] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const [bill, setBill] = useState<Bill | null>(null)
  const [discountPercent, setDiscountPercent] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('0.00')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'mobile_wallet'>('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Helper function to log operations
  const logOperation = (operation: string, details: any) => {
    const logMsg = `[${new Date().toISOString()}] ${operation}: ${JSON.stringify(details)}`
    console.log(logMsg)
    setDebugLogs(prev => [...prev.slice(-9), logMsg])
  }

  // Helper function to handle errors
  const handleError = (operation: string, error: any) => {
    const errorMsg = `${operation} failed: ${error?.message || 'Unknown error'}`
    const errorDetails = {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code
    }
    console.error(`[ERROR] ${operation}:`, errorDetails)
    logOperation(`ERROR: ${operation}`, errorDetails)
    setError(`${errorMsg}${error?.code ? ` (${error.code})` : ''}`)
    return false
  }

  useEffect(() => {
    loadOrders()
    loadMenuItems()
    loadBill()
  }, [session.id])

  const loadOrders = async () => {
    try {
      logOperation('loadOrders', { session_id: session.id })
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            menu_item:menu_items(*)
          )
        `)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })

      if (error) {
        handleError('loadOrders', error)
        setLoading(false)
        return
      }

      logOperation('loadOrders.success', { count: data?.length || 0 })
      setOrders(data || [])
      setLoading(false)
    } catch (err) {
      handleError('loadOrders', err)
      setLoading(false)
    }
  }

  const loadMenuItems = async () => {
    try {
      logOperation('loadMenuItems', { filters: { is_active: true, is_available: true, is_deleted: false } })
      
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_available', true)
        .eq('is_deleted', false)
        .order('name')

      if (error) {
        handleError('loadMenuItems', error)
        return
      }

      logOperation('loadMenuItems.success', { count: data?.length || 0 })
      setMenuItems(data || [])
    } catch (err) {
      handleError('loadMenuItems', err)
    }
  }

  const loadBill = async () => {
    try {
      logOperation('loadBill', { session_id: session.id })
      
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('session_id', session.id)
        .maybeSingle()

      if (error) {
        handleError('loadBill', error)
        return
      }

      if (data) {
        logOperation('loadBill.success', { bill_id: data.id })
        setBill(data)
        if (data.discount_percentage) {
          setDiscountPercent(data.discount_percentage.toString())
        }
        if (data.discount_amount) {
          setDiscountAmount(data.discount_amount.toString())
        }
        if (data.delivery_fee) {
          setDeliveryFee(data.delivery_fee.toString())
        }
      } else {
        logOperation('loadBill.success', { bill: 'not found' })
      }
    } catch (err) {
      handleError('loadBill', err)
    }
  }

  const createManualOrder = async () => {
    if (!currentUser || Object.keys(selectedItems).length === 0) {
      setError('No items selected or user not authenticated')
      return
    }

    // Prevent double submission
    if (isSubmitting) {
      logOperation('createManualOrder.blocked', { reason: 'already submitting' })
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      
      // Generate unique request ID for idempotency
      const requestId = crypto.randomUUID()
      
      logOperation('createManualOrder.start', { 
        session_id: session.id,
        business_day_id: session.business_day_id,
        item_count: Object.keys(selectedItems).length,
        request_id: requestId
      })

      // Create order
      const orderPayload = {
        session_id: session.id,
        business_day_id: session.business_day_id,
        source: 'manual',
        status: 'accepted',
        created_by: currentUser.id,
        accepted_by: currentUser.id,
        accepted_at: new Date().toISOString(),
        notes: `client_req:${requestId}`
      }

      logOperation('createManualOrder.insertOrder', orderPayload)
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single()

      if (orderError || !order) {
        handleError('createManualOrder.insertOrder', orderError)
        alert(`Failed to create order: ${orderError?.message || 'Unknown error'}${orderError?.code ? ` (${orderError.code})` : ''}`)
        return
      }

      logOperation('createManualOrder.orderCreated', { order_id: order.id })

      // Create order items
      const orderItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
        const menuItem = menuItems.find(m => m.id === itemId)
        if (!menuItem) {
          console.error(`Menu item not found: ${itemId}`)
          throw new Error(`A selected menu item is no longer available. Please refresh and try again.`)
        }
        return {
          order_id: order.id,
          menu_item_id: itemId,
          quantity,
          unit_price: menuItem.price || 0,
          subtotal: (menuItem.price || 0) * quantity
        }
      })

      logOperation('createManualOrder.insertOrderItems', { 
        order_id: order.id,
        items_count: orderItems.length,
        payload_size: JSON.stringify(orderItems).length 
      })

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        // Rollback: delete the order we just created since it was never valid
        // We use soft delete (status='cancelled') to maintain audit trail
        logOperation('createManualOrder.rollback', { order_id: order.id, reason: 'order_items insert failed' })
        
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id)
        
        handleError('createManualOrder.insertOrderItems', itemsError)
        alert(`Failed to add items to order: ${itemsError.message || 'Unknown error'}${itemsError.code ? ` (${itemsError.code})` : ''}`)
        return
      }

      logOperation('createManualOrder.success', { order_id: order.id })
      setSelectedItems({})
      setShowAddItems(false)
      loadOrders()
      onUpdate()
    } catch (err: any) {
      handleError('createManualOrder', err)
      alert(`Error creating order: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const printOrder = async (orderId: string) => {
    try {
      logOperation('printOrder', { order_id: orderId })
      
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'printed',
          printed_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) {
        handleError('printOrder', error)
        alert(`Failed to print order: ${error.message}`)
        return
      }

      logOperation('printOrder.success', { order_id: orderId })
      loadOrders()
      onUpdate()
      
      // Open print page for kitchen ticket
      window.open(`/print/kitchen/${orderId}`, '_blank')
    } catch (err) {
      handleError('printOrder', err)
    }
  }

  const createOrUpdateBill = async () => {
    if (!currentUser) {
      setError('User not authenticated')
      return
    }

    try {
      setError(null)
      logOperation('createOrUpdateBill.start', { bill_exists: !!bill })

      // Calculate totals from all printed orders
      const printedOrders = orders.filter(o => o.status === 'printed' || o.status === 'paid')
      const subtotal = printedOrders.reduce((sum, order) => {
        return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.subtotal, 0) || 0)
      }, 0)

      const discountAmt = discountAmount ? parseFloat(discountAmount) : 
                          discountPercent ? (subtotal * parseFloat(discountPercent) / 100) : 0
      
      // Check discount limits
      if (currentUser.role === 'cashier' && discountPercent && parseFloat(discountPercent) > 15) {
        setError(translate('pos.maxDiscount', language))
        alert(translate('pos.maxDiscount', language))
        return
      }
      if (currentUser.role === 'owner' && discountPercent && parseFloat(discountPercent) > 30) {
        const msg = translate('pos.maxOwnerDiscount', language) || 'Owner discount limit is 30%'
        setError(msg)
        alert(msg)
        return
      }

      // Ensure discount doesn't exceed subtotal
      if (discountAmt > subtotal) {
        setError('Discount amount cannot exceed subtotal')
        alert('Discount amount cannot exceed subtotal')
        return
      }

      const deliveryAmount = session.order_type === 'delivery' ? (parseFloat(deliveryFee) || 0) : 0

      const billData = {
        subtotal,
        discount_amount: discountAmt,
        discount_percentage: discountPercent ? parseFloat(discountPercent) : null,
        delivery_fee: deliveryAmount
      }

      logOperation('createOrUpdateBill.data', { ...billData, bill_id: bill?.id })

      if (bill) {
        // Update existing bill
        const { error } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', bill.id)
        
        if (error) {
          handleError('createOrUpdateBill.update', error)
          alert(`Failed to update bill: ${error.message}${error.code ? ` (${error.code})` : ''}`)
          return
        }

        logOperation('createOrUpdateBill.updateSuccess', { bill_id: bill.id })
      } else {
        // Create new bill
        const insertData = {
          ...billData,
          session_id: session.id,
          business_day_id: session.business_day_id,
          created_by: currentUser.id
        }

        logOperation('createOrUpdateBill.insert', insertData)

        const { error } = await supabase
          .from('bills')
          .insert(insertData)
        
        if (error) {
          handleError('createOrUpdateBill.insert', error)
          alert(`Failed to create bill: ${error.message}${error.code ? ` (${error.code})` : ''}`)
          return
        }

        logOperation('createOrUpdateBill.insertSuccess', { session_id: session.id })
      }

      loadBill()
    } catch (err) {
      handleError('createOrUpdateBill', err)
      alert(`Error with bill: ${(err as any).message || 'Unknown error'}`)
    }
  }

  const processPayment = async () => {
    if (!bill || !currentUser) {
      setError('Bill or user not found')
      return
    }

    try {
      setError(null)
      logOperation('processPayment.start', { bill_id: bill.id, bill_total: bill.total })

      const paid = parseFloat(amountPaid)
      
      // Validate payment amount
      if (paid < bill.total) {
        setError(translate('pos.paymentTooLow', language))
        alert(translate('pos.paymentTooLow', language))
        return
      }
      
      const change = paid - bill.total

      // Create payment record
      logOperation('processPayment.insertPayment', { bill_id: bill.id, amount: paid, method: paymentMethod })
      
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          bill_id: bill.id,
          business_day_id: session.business_day_id,
          payment_method: paymentMethod,
          amount: paid,
          created_by: currentUser.id
        })

      if (paymentError) {
        handleError('processPayment.insertPayment', paymentError)
        alert(`Failed to create payment: ${paymentError.message}${paymentError.code ? ` (${paymentError.code})` : ''}`)
        return
      }

      // Update bill
      logOperation('processPayment.updateBill', { bill_id: bill.id, paid_amount: paid, change_amount: change })
      
      const { error: billError } = await supabase
        .from('bills')
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_amount: paid,
          change_amount: change
        })
        .eq('id', bill.id)

      if (billError) {
        handleError('processPayment.updateBill', billError)
        alert(`Failed to update bill: ${billError.message}`)
        return
      }

      // Update all orders to paid
      logOperation('processPayment.updateOrders', { session_id: session.id })
      
      const { error: ordersError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('session_id', session.id)

      if (ordersError) {
        handleError('processPayment.updateOrders', ordersError)
        // Continue anyway since payment was recorded
      }

      // Close session
      logOperation('processPayment.closeSession', { session_id: session.id })
      
      const { error: sessionError } = await supabase
        .from('sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (sessionError) {
        handleError('processPayment.closeSession', sessionError)
        // Continue anyway since payment was recorded
      }

      logOperation('processPayment.success', { bill_id: bill.id })

      // Print receipt
      window.open(`/print/receipt/${bill.id}`, '_blank')

      onUpdate()
      onClose()
    } catch (err) {
      handleError('processPayment', err)
      alert(`Payment processing error: ${(err as any).message || 'Unknown error'}`)
    }
  }

  const calculateBillPreview = () => {
    const printedOrders = orders.filter(o => o.status === 'printed' || o.status === 'paid')
    const subtotal = printedOrders.reduce((sum, order) => {
      return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.subtotal, 0) || 0)
    }, 0)

    const discountAmt = discountAmount ? parseFloat(discountAmount) : 
                        discountPercent ? (subtotal * parseFloat(discountPercent) / 100) : 0
    
    const taxableAmount = subtotal - discountAmt
    const taxRate = session.order_type === 'dine_in' ? 0.14 : 0
    const taxAmount = taxableAmount * taxRate
    const deliveryAmount = session.order_type === 'delivery' ? parseFloat(deliveryFee || '0') : 0
    const total = taxableAmount + taxAmount + deliveryAmount

    return { subtotal, discountAmt, taxableAmount, taxRate, taxAmount, deliveryAmount, total }
  }

  if (loading) {
    return <div className="p-8 text-center">{translate('common.loading', language)}</div>
  }

  const billPreview = calculateBillPreview()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        {/* Error Toast */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <button
              onClick={() => setError(null)}
              className="absolute top-0 right-0 px-4 py-3 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">
              {session.order_type === 'dine_in' ? `Table Session` : `${session.order_type} Session`}
            </h2>
            <p className="text-sm text-gray-600">
              {session.customer_name && `${session.customer_name} - `}
              {session.customer_phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{translate('pos.viewOrders', language)}</h3>
              <button
                onClick={() => setShowAddItems(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {translate('pos.addItems', language)}
              </button>
            </div>

            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-xs text-gray-500">
                        {order.source === 'qr' ? 'QR Order' : 'Manual'} - {order.status}
                      </div>
                    </div>
                    {order.status === 'accepted' && (
                      <button
                        onClick={() => printOrder(order.id)}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        {translate('pos.printKitchen', language)}
                      </button>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity}x {item.menu_item?.name}</span>
                        <span>{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No orders yet
                </div>
              )}
            </div>
          </div>

          {/* Billing Panel */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{translate('pos.closeAndPay', language)}</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{translate('pos.subtotal', language)}:</span>
                  <span>{formatPrice(billPreview.subtotal)}</span>
                </div>

                <div>
                  <label className="block text-sm mb-1">{translate('pos.discount', language)}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="%"
                      value={discountPercent}
                      onChange={(e) => {
                        setDiscountPercent(e.target.value)
                        setDiscountAmount('')
                      }}
                      onBlur={createOrUpdateBill}
                      className="w-1/2 px-2 py-1 border rounded text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={discountAmount}
                      onChange={(e) => {
                        setDiscountAmount(e.target.value)
                        setDiscountPercent('')
                      }}
                      onBlur={createOrUpdateBill}
                      className="w-1/2 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  {currentUser?.role === 'cashier' && discountPercent && parseFloat(discountPercent) > 15 && (
                    <p className="text-xs text-red-600 mt-1">Max 15% for cashiers</p>
                  )}
                </div>

                {billPreview.discountAmt > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatPrice(billPreview.discountAmt)}</span>
                  </div>
                )}

                {session.order_type === 'dine_in' && (
                  <div className="flex justify-between">
                    <span>{translate('pos.tax', language)} ({(billPreview.taxRate * 100)}%):</span>
                    <span>{formatPrice(billPreview.taxAmount)}</span>
                  </div>
                )}

                {session.order_type === 'delivery' && (
                  <div>
                    <label className="block text-sm mb-1">{translate('pos.deliveryFee', language)}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      onBlur={createOrUpdateBill}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                )}

                {billPreview.deliveryAmount > 0 && (
                  <div className="flex justify-between">
                    <span>{translate('pos.deliveryFee', language)}:</span>
                    <span>{formatPrice(billPreview.deliveryAmount)}</span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{translate('pos.total', language)}:</span>
                    <span>{formatPrice(billPreview.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {bill && !bill.is_paid && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="cash">{translate('pos.cash', language)}</option>
                    <option value="card">{translate('pos.card', language)}</option>
                    <option value="bank_transfer">{translate('pos.bankTransfer', language)}</option>
                    <option value="mobile_wallet">{translate('pos.mobileWallet', language)}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  {amountPaid && parseFloat(amountPaid) >= billPreview.total && (
                    <p className="text-sm text-green-600 mt-1">
                      Change: {formatPrice(parseFloat(amountPaid) - billPreview.total)}
                    </p>
                  )}
                </div>

                <button
                  onClick={processPayment}
                  disabled={!amountPaid || parseFloat(amountPaid) < billPreview.total}
                  className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  {translate('pos.pay', language)} & {translate('pos.printReceipt', language)}
                </button>
              </div>
            )}

            {bill && bill.is_paid && (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center">
                <p className="text-green-800 font-semibold">Bill Paid</p>
                <p className="text-sm text-green-600">
                  {new Date(bill.paid_at!).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Items Dialog */}
        {showAddItems && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{translate('pos.addItems', language)}</h3>
                <button
                  onClick={() => setShowAddItems(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 mb-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">{formatPrice(item.price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const current = selectedItems[item.id] || 0
                          if (current > 0) {
                            setSelectedItems({ ...selectedItems, [item.id]: current - 1 })
                          }
                        }}
                        className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{selectedItems[item.id] || 0}</span>
                      <button
                        onClick={() => {
                          const current = selectedItems[item.id] || 0
                          setSelectedItems({ ...selectedItems, [item.id]: current + 1 })
                        }}
                        className="w-8 h-8 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createManualOrder}
                  disabled={Object.keys(selectedItems).length === 0 || isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? translate('common.loading', language) || 'Submitting...' : translate('common.add', language)}
                </button>
                <button
                  onClick={() => {
                    setSelectedItems({})
                    setShowAddItems(false)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  {translate('common.cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostics Section (Dev Only) */}
        {process.env.NODE_ENV === 'development' && debugLogs.length > 0 && (
          <div className="mt-6 p-4 bg-gray-100 rounded border border-gray-300">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-sm">Diagnostics (Last 10 operations)</h4>
              <button
                onClick={() => setDebugLogs([])}
                className="text-xs px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Clear
              </button>
            </div>
            <div className="text-xs font-mono bg-white p-2 rounded max-h-40 overflow-y-auto">
              {debugLogs.map((log, idx) => (
                <div key={idx} className="py-1 border-b border-gray-200 last:border-0">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
