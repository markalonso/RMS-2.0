export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
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
  number: string
  status: 'available' | 'occupied' | 'reserved'
  capacity: number
}
