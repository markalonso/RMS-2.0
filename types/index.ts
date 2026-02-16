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
  business_day_id: string
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  delivery_fee?: number
  guest_count?: number
  opened_at: string
  closed_at?: string
  created_by?: string
}

export interface BusinessDay {
  id: string
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  opened_by: string
  closed_by?: string
  opening_cash: number
  closing_cash?: number
  expected_cash?: number
  cash_difference?: number
  notes?: string
}

export interface Bill {
  id: string
  session_id: string
  business_day_id: string
  bill_number: string
  subtotal: number
  discount_amount: number
  discount_percentage?: number
  tax_percentage: number
  tax_amount: number
  delivery_fee: number
  total: number
  is_paid: boolean
  paid_at?: string
  paid_amount?: number
  change_amount?: number
  created_by: string
}

export interface Payment {
  id: string
  bill_id: string
  business_day_id: string
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'mobile_wallet'
  amount: number
  reference_number?: string
  created_by: string
  created_at: string
}

export interface Profile {
  id: string
  role: 'owner' | 'cashier'
  full_name: string
  email?: string
  phone?: string
  is_active: boolean
}
