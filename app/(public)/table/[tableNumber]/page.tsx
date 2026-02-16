'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { use, useEffect, useState, useCallback } from 'react'
import type { Table, Session, MenuCategory, MenuItem, ModifierGroup, Modifier, CartItem } from '@/types'

interface PageProps {
  params: Promise<{ tableNumber: string }>
}

export default function TablePage({ params }: PageProps) {
  const { language } = useLanguage()
  const { tableNumber } = use(params)
  
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState<Table | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [itemModifierGroups, setItemModifierGroups] = useState<ModifierGroup[]>([])
  const [selectedModifiers, setSelectedModifiers] = useState<Map<string, Modifier[]>>(new Map())
  const [itemNotes, setItemNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)

  // Rate limiting: minimum 2 seconds between submissions
  const RATE_LIMIT_MS = 2000

  useEffect(() => {
    loadTableData()
  }, [tableNumber])

  const loadTableData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load table info
      const { data: tableData, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('is_deleted', false)
        .single()

      if (tableError) throw tableError
      setTable(tableData)

      // Check if QR ordering is disabled
      if (!tableData.qr_enabled) {
        return
      }

      // Load active session for this table
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_id', tableData.id)
        .eq('status', 'active')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError
      }
      
      setSession(sessionData)

      // Load menu data if session exists
      if (sessionData) {
        await loadMenu()
      }
    } catch (err: any) {
      console.error('Error loading table data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadMenu = async () => {
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('display_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Load menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_available', true)
        .eq('is_deleted', false)
        .order('display_order')

      if (itemsError) throw itemsError
      setMenuItems(itemsData || [])
    } catch (err: any) {
      console.error('Error loading menu:', err)
      setError(err.message)
    }
  }

  const loadModifiersForItem = async (itemId: string) => {
    try {
      // Load modifier groups for this item
      const { data: itemModGroups, error: imgError } = await supabase
        .from('item_modifier_groups')
        .select('modifier_group_id')
        .eq('menu_item_id', itemId)

      if (imgError) throw imgError

      if (!itemModGroups || itemModGroups.length === 0) {
        setItemModifierGroups([])
        return
      }

      const groupIds = itemModGroups.map(img => img.modifier_group_id)

      // Load modifier groups with their modifiers
      const { data: modGroups, error: mgError } = await supabase
        .from('modifier_groups')
        .select('*')
        .in('id', groupIds)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (mgError) throw mgError

      // Load modifiers for these groups
      const { data: modifiers, error: modError } = await supabase
        .from('modifiers')
        .select('*')
        .in('modifier_group_id', groupIds)
        .eq('is_active', true)
        .eq('is_deleted', false)

      if (modError) throw modError

      // Group modifiers by modifier_group_id
      const groupedModifiers = (modGroups || []).map(group => ({
        ...group,
        modifiers: (modifiers || []).filter(m => m.modifier_group_id === group.id)
      }))

      setItemModifierGroups(groupedModifiers)
    } catch (err: any) {
      console.error('Error loading modifiers:', err)
    }
  }

  const openItemDialog = async (item: MenuItem) => {
    setSelectedItem(item)
    setSelectedModifiers(new Map())
    setItemNotes('')
    await loadModifiersForItem(item.id)
  }

  const closeItemDialog = () => {
    setSelectedItem(null)
    setItemModifierGroups([])
    setSelectedModifiers(new Map())
    setItemNotes('')
  }

  const toggleModifier = (groupId: string, modifier: Modifier, group: ModifierGroup) => {
    const newMap = new Map(selectedModifiers)
    const currentMods = newMap.get(groupId) || []
    
    const existingIndex = currentMods.findIndex(m => m.id === modifier.id)
    
    if (existingIndex >= 0) {
      // Remove modifier
      currentMods.splice(existingIndex, 1)
    } else {
      // Add modifier (check max_selection)
      if (currentMods.length < group.max_selection) {
        currentMods.push(modifier)
      } else if (group.max_selection === 1) {
        // Radio button behavior: replace
        currentMods[0] = modifier
      }
    }
    
    if (currentMods.length === 0) {
      newMap.delete(groupId)
    } else {
      newMap.set(groupId, currentMods)
    }
    
    setSelectedModifiers(newMap)
  }

  const canAddToCart = (): boolean => {
    // Check if all required modifier groups have minimum selections
    for (const group of itemModifierGroups) {
      if (group.is_required || group.min_selection > 0) {
        const selected = selectedModifiers.get(group.id) || []
        if (selected.length < group.min_selection) {
          return false
        }
      }
    }
    return true
  }

  const addToCart = () => {
    if (!selectedItem || !canAddToCart()) return

    const modifiersArray = Array.from(selectedModifiers.entries()).flatMap(([groupId, mods]) =>
      mods.map(mod => ({ modifier: mod, quantity: 1 }))
    )

    const cartItem: CartItem = {
      menuItem: selectedItem,
      quantity: 1,
      notes: itemNotes || undefined,
      modifiers: modifiersArray
    }

    setCart([...cart, cartItem])
    closeItemDialog()
  }

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index))
  }

  const updateCartItemQuantity = (index: number, delta: number) => {
    const newCart = [...cart]
    const newQuantity = newCart[index].quantity + delta
    if (newQuantity > 0) {
      newCart[index].quantity = newQuantity
      setCart(newCart)
    } else {
      removeFromCart(index)
    }
  }

  const calculateItemTotal = (cartItem: CartItem): number => {
    let total = cartItem.menuItem.price * cartItem.quantity
    cartItem.modifiers.forEach(mod => {
      total += mod.modifier.price_adjustment * mod.quantity * cartItem.quantity
    })
    return total
  }

  const submitOrder = async () => {
    // Rate limiting check
    const now = Date.now()
    if (now - lastSubmitTime < RATE_LIMIT_MS) {
      setError('Please wait a moment before submitting again.')
      return
    }

    if (cart.length === 0) {
      setError('Cart is empty')
      return
    }

    if (!session || !table) {
      setError('Session not found')
      return
    }

    setSubmitting(true)
    setError(null)
    setLastSubmitTime(now)

    try {
      // Get current business day
      const { data: businessDay, error: bdError } = await supabase
        .from('business_days')
        .select('id')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single()

      if (bdError || !businessDay) {
        throw new Error('No open business day found')
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          session_id: session.id,
          business_day_id: businessDay.id,
          source: 'qr',
          status: 'pending',
          notes: null
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(cartItem => ({
        order_id: order.id,
        menu_item_id: cartItem.menuItem.id,
        quantity: cartItem.quantity,
        unit_price: cartItem.menuItem.price,
        subtotal: cartItem.menuItem.price * cartItem.quantity,
        notes: cartItem.notes
      }))

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select()

      if (itemsError) throw itemsError

      // Create order item modifiers
      const allModifiers: any[] = []
      cart.forEach((cartItem, cartIndex) => {
        const orderItemId = createdItems[cartIndex].id
        cartItem.modifiers.forEach(mod => {
          allModifiers.push({
            order_item_id: orderItemId,
            modifier_id: mod.modifier.id,
            quantity: mod.quantity,
            price_adjustment: mod.modifier.price_adjustment
          })
        })
      })

      if (allModifiers.length > 0) {
        const { error: modError } = await supabase
          .from('order_item_modifiers')
          .insert(allModifiers)

        if (modError) throw modError
      }

      // Success!
      setCart([])
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (err: any) {
      console.error('Error submitting order:', err)
      setError(err.message || 'Failed to submit order')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category_id === selectedCategory)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-xl text-gray-600">{translate('common.loading', language)}</div>
        </div>
      </div>
    )
  }

  if (!table) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">
            {translate('common.error', language)}
          </h2>
          <p className="text-red-700">Table not found</p>
        </div>
      </div>
    )
  }

  if (!table.qr_enabled) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {translate('table.disabled', language)}
          </h2>
          <p className="text-yellow-700">
            {translate('table.disabledMessage', language)}
          </p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {translate('table.notActive', language)}
          </h2>
          <p className="text-yellow-700">
            {translate('table.notActiveMessage', language)}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {translate('table.title', language)} {tableNumber}
        </h1>
        <p className="text-gray-600">
          {translate('table.order', language)}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-1">
            {translate('table.orderSuccess', language)}
          </h3>
          <p className="text-green-700">
            {translate('table.orderSuccessMessage', language)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {translate('table.menu', language)}
            </h2>

            {/* Category Filter */}
            <div className="mb-6 overflow-x-auto">
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {translate('table.all', language)}
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No items available in this category
                </p>
              ) : (
                filteredItems.map(item => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => openItemDialog(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-lg font-bold text-gray-900">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 sticky top-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {translate('table.cart', language)}
            </h2>

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {translate('table.cartEmpty', language)}
              </p>
            ) : (
              <>
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {cart.map((cartItem, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{cartItem.menuItem.name}</h4>
                          {cartItem.modifiers.length > 0 && (
                            <div className="text-sm text-gray-600 mt-1">
                              {cartItem.modifiers.map((mod, i) => (
                                <div key={i}>
                                  + {mod.modifier.name}
                                  {mod.modifier.price_adjustment > 0 && ` (+$${mod.modifier.price_adjustment.toFixed(2)})`}
                                </div>
                              ))}
                            </div>
                          )}
                          {cartItem.notes && (
                            <div className="text-sm text-gray-600 mt-1 italic">
                              Note: {cartItem.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-bold text-gray-900">
                            ${calculateItemTotal(cartItem).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartItemQuantity(index, -1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="font-medium w-8 text-center">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateCartItemQuantity(index, 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          {translate('common.remove', language)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={submitOrder}
                  disabled={submitting}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {submitting
                    ? translate('table.submitting', language)
                    : translate('table.submitOrder', language)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedItem.name}</h3>
                  <p className="text-gray-600 mt-1">{selectedItem.description}</p>
                  <p className="text-xl font-bold text-gray-900 mt-2">
                    ${selectedItem.price.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={closeItemDialog}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modifiers */}
              {itemModifierGroups.length > 0 && (
                <div className="space-y-6 mb-6">
                  <h4 className="font-semibold text-gray-900">
                    {translate('table.modifiers', language)}
                  </h4>
                  {itemModifierGroups.map(group => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="mb-3">
                        <h5 className="font-medium text-gray-900">{group.name}</h5>
                        <p className="text-sm text-gray-600">
                          {group.is_required && `${translate('common.required', language)} - `}
                          {translate('table.selectAtLeast', language)} {group.min_selection}{' '}
                          {group.max_selection !== group.min_selection &&
                            `- ${translate('table.selectUpTo', language)} ${group.max_selection}`}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {group.modifiers?.map(modifier => {
                          const selected = (selectedModifiers.get(group.id) || []).some(
                            m => m.id === modifier.id
                          )
                          return (
                            <label
                              key={modifier.id}
                              className="flex items-center justify-between p-2 rounded hover:bg-gray-50 cursor-pointer"
                            >
                              <div className="flex items-center">
                                <input
                                  type={group.max_selection === 1 ? 'radio' : 'checkbox'}
                                  checked={selected}
                                  onChange={() => toggleModifier(group.id, modifier, group)}
                                  className="mr-3"
                                />
                                <span className="text-gray-900">{modifier.name}</span>
                              </div>
                              {modifier.price_adjustment !== 0 && (
                                <span className="text-gray-600">
                                  {modifier.price_adjustment > 0 ? '+' : ''}$
                                  {modifier.price_adjustment.toFixed(2)}
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translate('table.addNotes', language)} ({translate('common.optional', language)})
                </label>
                <textarea
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="e.g., No onions, extra sauce..."
                />
              </div>

              {/* Add to Cart Button */}
              <div className="flex gap-3">
                <button
                  onClick={closeItemDialog}
                  className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {translate('common.cancel', language)}
                </button>
                <button
                  onClick={addToCart}
                  disabled={!canAddToCart()}
                  className={`flex-1 py-3 rounded-lg font-semibold ${
                    canAddToCart()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {translate('table.addToCart', language)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
