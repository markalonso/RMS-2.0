export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  category_id: string
  available: boolean
  is_available: boolean
  is_active: boolean
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  display_order: number
  is_active: boolean
}

export interface Modifier {
  id: string
  modifier_group_id: string
  name: string
  price_adjustment: number
  is_active: boolean
}

export interface ModifierGroup {
  id: string
  name: string
  min_selection: number
  max_selection: number
  is_required: boolean
  is_active: boolean
  modifiers?: Modifier[]
}

export interface CartItem {
  menuItem: MenuItem
  quantity: number
  notes?: string
  modifiers: Array<{
    modifier: Modifier
    quantity: number
  }>
}

export interface Order {
  id: string
  tableNumber: string
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'paid'
  totalAmount: number
  createdAt: Date
}

export interface OrderItem {
  menuItemId: string
  quantity: number
  notes?: string
}

export interface Table {
  id: string
  table_number: string
  qr_enabled: boolean
  is_active: boolean
  capacity: number
}

export interface Session {
  id: string
  table_id: string
  status: 'active' | 'closed'
  order_type: 'dine_in' | 'takeaway' | 'delivery'
}
