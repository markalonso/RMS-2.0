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

  useEffect(() => {
    loadOrders()
    loadMenuItems()
    loadBill()
  }, [session.id])

  const loadOrders = async () => {
    const { data } = await supabase
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

    setOrders(data || [])
    setLoading(false)
  }

  const loadMenuItems = async () => {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_active', true)
      .eq('is_available', true)
      .is('deleted_at', null)
      .order('name')

    setMenuItems(data || [])
  }

  const loadBill = async () => {
    const { data } = await supabase
      .from('bills')
      .select('*')
      .eq('session_id', session.id)
      .maybeSingle()

    if (data) {
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
    }
  }

  const createManualOrder = async () => {
    if (!currentUser || Object.keys(selectedItems).length === 0) return

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: session.id,
        business_day_id: session.business_day_id,
        source: 'manual',
        status: 'accepted',
        created_by: currentUser.id,
        accepted_by: currentUser.id,
        accepted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orderError || !order) {
      alert('Error creating order')
      return
    }

    // Create order items
    const orderItems = Object.entries(selectedItems).map(([itemId, quantity]) => {
      const menuItem = menuItems.find(m => m.id === itemId)
      return {
        order_id: order.id,
        menu_item_id: itemId,
        quantity,
        unit_price: menuItem?.price || 0,
        subtotal: (menuItem?.price || 0) * quantity
      }
    })

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (!itemsError) {
      setSelectedItems({})
      setShowAddItems(false)
      loadOrders()
      onUpdate()
    }
  }

  const printOrder = async (orderId: string) => {
    await supabase
      .from('orders')
      .update({
        status: 'printed',
        printed_at: new Date().toISOString()
      })
      .eq('id', orderId)

    loadOrders()
    onUpdate()
    
    // Open print page for kitchen ticket
    window.open(`/print/kitchen/${orderId}`, '_blank')
  }

  const createOrUpdateBill = async () => {
    if (!currentUser) return

    // Calculate totals from all printed orders
    const printedOrders = orders.filter(o => o.status === 'printed' || o.status === 'paid')
    const subtotal = printedOrders.reduce((sum, order) => {
      return sum + (order.order_items?.reduce((itemSum, item) => itemSum + item.subtotal, 0) || 0)
    }, 0)

    const discountAmt = discountAmount ? parseFloat(discountAmount) : 
                        discountPercent ? (subtotal * parseFloat(discountPercent) / 100) : 0
    
    // Check discount limits
    if (currentUser.role === 'cashier' && discountPercent && parseFloat(discountPercent) > 15) {
      alert(translate('pos.maxDiscount', language))
      return
    }
    if (currentUser.role === 'owner' && discountPercent && parseFloat(discountPercent) > 30) {
      alert(translate('pos.maxOwnerDiscount', language) || 'Owner discount limit is 30%')
      return
    }

    const deliveryAmount = session.order_type === 'delivery' ? parseFloat(deliveryFee) : 0

    if (bill) {
      // Update existing bill
      await supabase
        .from('bills')
        .update({
          subtotal,
          discount_amount: discountAmt,
          discount_percentage: discountPercent ? parseFloat(discountPercent) : null,
          delivery_fee: deliveryAmount
        })
        .eq('id', bill.id)
    } else {
      // Create new bill
      await supabase
        .from('bills')
        .insert({
          session_id: session.id,
          business_day_id: session.business_day_id,
          subtotal,
          discount_amount: discountAmt,
          discount_percentage: discountPercent ? parseFloat(discountPercent) : null,
          delivery_fee: deliveryAmount,
          created_by: currentUser.id
        })
    }

    loadBill()
  }

  const processPayment = async () => {
    if (!bill || !currentUser) return

    const paid = parseFloat(amountPaid)
    
    // Validate payment amount
    if (paid < bill.total) {
      alert(translate('pos.paymentTooLow', language))
      return
    }
    
    const change = paid - bill.total

    // Create payment record
    await supabase
      .from('payments')
      .insert({
        bill_id: bill.id,
        business_day_id: session.business_day_id,
        payment_method: paymentMethod,
        amount: paid,
        created_by: currentUser.id
      })

    // Update bill
    await supabase
      .from('bills')
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        paid_amount: paid,
        change_amount: change
      })
      .eq('id', bill.id)

    // Update all orders to paid
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('session_id', session.id)

    // Close session
    await supabase
      .from('sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', session.id)

    // Print receipt
    window.open(`/print/receipt/${bill.id}`, '_blank')

    onUpdate()
    onClose()
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
                  disabled={Object.keys(selectedItems).length === 0}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {translate('common.add', language)}
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
      </div>
    </div>
  )
}
