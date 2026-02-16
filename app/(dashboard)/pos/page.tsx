'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { Table, Session, BusinessDay, Profile } from '@/types'
import { formatPrice } from '@/utils/helpers'

interface TableWithSession extends Table {
  activeSession?: Session
  pendingOrdersCount?: number
}

export default function POSPage() {
  const { language } = useLanguage()
  const [businessDay, setBusinessDay] = useState<BusinessDay | null>(null)
  const [tables, setTables] = useState<TableWithSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null)
  const [showOpenDayDialog, setShowOpenDayDialog] = useState(false)
  const [showCloseDayDialog, setShowCloseDayDialog] = useState(false)
  const [showSessionDialog, setShowSessionDialog] = useState(false)
  const [showTakeawayDialog, setShowTakeawayDialog] = useState(false)
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false)
  const [showPendingOrders, setShowPendingOrders] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [pendingOrders, setPendingOrders] = useState<any[]>([])

  // Form states
  const [openingCash, setOpeningCash] = useState('500.00')
  const [closingCash, setClosingCash] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [deliveryFee, setDeliveryFee] = useState('5.00')
  const [guestCount, setGuestCount] = useState('2')

  // Load current user
  useEffect(() => {
    loadCurrentUser()
  }, [])

  // Load business day and tables
  useEffect(() => {
    loadBusinessDay()
    loadTables()
  }, [])

  // Auto-refresh tables every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadTables()
      if (showPendingOrders) {
        loadPendingOrders()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [showPendingOrders])

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setCurrentUser(profile)
    }
  }

  const loadBusinessDay = async () => {
    const { data } = await supabase
      .from('business_days')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setBusinessDay(data)
    }
    setLoading(false)
  }

  const loadTables = async () => {
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('table_number')

    if (!tablesData) return

    // Load active sessions and pending orders for each table
    const tablesWithSessions = await Promise.all(
      tablesData.map(async (table) => {
        const { data: session } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_id', table.id)
          .eq('status', 'active')
          .maybeSingle()

        let pendingCount = 0
        if (session) {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .eq('status', 'pending')
            .eq('source', 'qr')

          pendingCount = count || 0
        }

        return {
          ...table,
          activeSession: session || undefined,
          pendingOrdersCount: pendingCount
        }
      })
    )

    setTables(tablesWithSessions)
  }

  const loadPendingOrders = async () => {
    if (!businessDay) return

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        session:sessions(*),
        order_items(
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq('business_day_id', businessDay.id)
      .eq('status', 'pending')
      .eq('source', 'qr')
      .order('created_at', { ascending: false })

    setPendingOrders(data || [])
  }

  const openBusinessDay = async () => {
    if (!currentUser) return

    const { data } = await supabase
      .from('business_days')
      .insert({
        status: 'open',
        opened_by: currentUser.id,
        opening_cash: parseFloat(openingCash)
      })
      .select()
      .single()

    if (data) {
      setBusinessDay(data)
      setShowOpenDayDialog(false)
      setOpeningCash('500.00')
    }
  }

  const closeBusinessDay = async () => {
    if (!businessDay || !currentUser) return

    const closingAmount = parseFloat(closingCash)
    const expectedAmount = businessDay.opening_cash

    const { data } = await supabase
      .from('business_days')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: currentUser.id,
        closing_cash: closingAmount,
        expected_cash: expectedAmount,
        cash_difference: closingAmount - expectedAmount
      })
      .eq('id', businessDay.id)
      .select()
      .single()

    if (data) {
      setBusinessDay(null)
      setShowCloseDayDialog(false)
      setClosingCash('')
    }
  }

  const openDineInSession = async (table: TableWithSession) => {
    if (!businessDay || !currentUser) return

    const { data } = await supabase
      .from('sessions')
      .insert({
        business_day_id: businessDay.id,
        table_id: table.id,
        order_type: 'dine_in',
        status: 'active',
        guest_count: parseInt(guestCount),
        created_by: currentUser.id
      })
      .select()
      .single()

    if (data) {
      setShowSessionDialog(false)
      setGuestCount('2')
      loadTables()
    }
  }

  const openTakeawaySession = async () => {
    if (!businessDay || !currentUser) return

    const { data } = await supabase
      .from('sessions')
      .insert({
        business_day_id: businessDay.id,
        order_type: 'takeaway',
        status: 'active',
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        created_by: currentUser.id
      })
      .select()
      .single()

    if (data) {
      setShowTakeawayDialog(false)
      setCustomerName('')
      setCustomerPhone('')
      alert('Takeaway session created. Add items functionality coming next.')
    }
  }

  const openDeliverySession = async () => {
    if (!businessDay || !currentUser) return

    const { data } = await supabase
      .from('sessions')
      .insert({
        business_day_id: businessDay.id,
        order_type: 'delivery',
        status: 'active',
        customer_name: customerName,
        customer_phone: customerPhone,
        created_by: currentUser.id
      })
      .select()
      .single()

    if (data) {
      setShowDeliveryDialog(false)
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setDeliveryFee('5.00')
      alert('Delivery session created. Add items functionality coming next.')
    }
  }

  const toggleQR = async (table: TableWithSession) => {
    await supabase
      .from('tables')
      .update({ qr_enabled: !table.qr_enabled })
      .eq('id', table.id)

    loadTables()
  }

  const acceptOrder = async (orderId: string) => {
    if (!currentUser) return

    await supabase
      .from('orders')
      .update({
        status: 'accepted',
        accepted_by: currentUser.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', orderId)

    loadPendingOrders()
    loadTables()
  }

  const rejectOrder = async (orderId: string) => {
    if (!currentUser) return

    await supabase
      .from('orders')
      .update({
        status: 'rejected',
        rejected_by: currentUser.id,
        rejected_at: new Date().toISOString()
      })
      .eq('id', orderId)

    loadPendingOrders()
    loadTables()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">{translate('common.loading', language)}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {translate('pos.title', language)}
              </h1>
              {businessDay ? (
                <p className="text-sm text-green-600 font-medium">
                  {translate('pos.dayOpen', language)} - {new Date(businessDay.opened_at).toLocaleDateString()}
                </p>
              ) : (
                <p className="text-sm text-red-600 font-medium">
                  {translate('pos.dayClosed', language)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {businessDay ? (
                <>
                  <button
                    onClick={() => {
                      loadPendingOrders()
                      setShowPendingOrders(true)
                    }}
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    {translate('pos.pendingOrders', language)}
                  </button>
                  <button
                    onClick={() => setShowCloseDayDialog(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    {translate('pos.closeDay', language)}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowOpenDayDialog(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  {translate('pos.openDay', language)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!businessDay ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <p className="text-lg text-yellow-800">
              {translate('pos.noBusinessDay', language)}
            </p>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setShowTakeawayDialog(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                {translate('pos.newTakeaway', language)}
              </button>
              <button
                onClick={() => setShowDeliveryDialog(true)}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-medium"
              >
                {translate('pos.newDelivery', language)}
              </button>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {tables.map((table) => (
                <div
                  key={table.id}
                  onClick={() => {
                    if (!table.activeSession) {
                      setSelectedTable(table)
                      setShowSessionDialog(true)
                    }
                  }}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${table.activeSession
                      ? 'bg-red-50 border-red-300 hover:border-red-400'
                      : 'bg-green-50 border-green-300 hover:border-green-400'
                    }
                  `}
                >
                  {/* Table Number */}
                  <div className="text-center mb-2">
                    <div className="text-2xl font-bold text-gray-900">
                      {table.table_number}
                    </div>
                    <div className={`text-xs font-medium ${table.activeSession ? 'text-red-600' : 'text-green-600'}`}>
                      {table.activeSession
                        ? translate('pos.occupied', language)
                        : translate('pos.available', language)
                      }
                    </div>
                  </div>

                  {/* Order Type Badge */}
                  {table.activeSession && (
                    <div className="text-center mb-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {translate(`pos.${table.activeSession.order_type}`, language)}
                      </span>
                    </div>
                  )}

                  {/* Pending Orders Badge */}
                  {table.pendingOrdersCount! > 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {table.pendingOrdersCount}
                    </div>
                  )}

                  {/* QR Status Toggle */}
                  <div className="mt-2 flex justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleQR(table)
                      }}
                      className={`text-xs px-2 py-1 rounded ${
                        table.qr_enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {table.qr_enabled
                        ? translate('pos.qrEnabled', language)
                        : translate('pos.qrDisabled', language)
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Open Day Dialog */}
      {showOpenDayDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">{translate('pos.openDay', language)}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.openingCash', language)}
              </label>
              <input
                type="number"
                step="0.01"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={openBusinessDay}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                {translate('common.confirm', language)}
              </button>
              <button
                onClick={() => setShowOpenDayDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {translate('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Day Dialog */}
      {showCloseDayDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">{translate('pos.closeDay', language)}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.closingCash', language)}
              </label>
              <input
                type="number"
                step="0.01"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={closeBusinessDay}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                {translate('common.confirm', language)}
              </button>
              <button
                onClick={() => setShowCloseDayDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {translate('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Session Dialog */}
      {showSessionDialog && selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {translate('pos.openSession', language)} - {selectedTable.table_number}
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.guestCount', language)}
              </label>
              <input
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => openDineInSession(selectedTable)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {translate('common.confirm', language)}
              </button>
              <button
                onClick={() => {
                  setShowSessionDialog(false)
                  setSelectedTable(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {translate('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Takeaway Dialog */}
      {showTakeawayDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">{translate('pos.newTakeaway', language)}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.customerName', language)} ({translate('common.optional', language)})
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.phone', language)} ({translate('common.optional', language)})
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={openTakeawaySession}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {translate('common.confirm', language)}
              </button>
              <button
                onClick={() => setShowTakeawayDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {translate('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Dialog */}
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">{translate('pos.newDelivery', language)}</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.customerName', language)}
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.phone', language)}
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.address', language)}
              </label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                rows={3}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {translate('pos.deliveryFee', language)}
              </label>
              <input
                type="number"
                step="0.01"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={openDeliverySession}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                {translate('common.confirm', language)}
              </button>
              <button
                onClick={() => setShowDeliveryDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                {translate('common.cancel', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Orders Panel */}
      {showPendingOrders && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{translate('pos.pendingOrders', language)}</h2>
              <button
                onClick={() => setShowPendingOrders(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptOrder(order.id)}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        {translate('pos.accept', language)}
                      </button>
                      <button
                        onClick={() => rejectOrder(order.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        {translate('pos.reject', language)}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm">
                    {order.order_items?.map((item: any, idx: number) => (
                      <div key={idx} className="py-1">
                        {item.quantity}x {item.menu_item?.name} - {formatPrice(item.subtotal)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No pending orders
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
