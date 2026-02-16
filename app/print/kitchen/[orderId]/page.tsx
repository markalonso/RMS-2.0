'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default function KitchenTicketPage({ params }: PageProps) {
  const { orderId } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (order && !loading) {
      // Auto-print when page loads
      window.print()
    }
  }, [order, loading])

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          session:sessions(
            table:tables(table_number),
            order_type
          ),
          order_items(
            *,
            menu_item:menu_items(name),
            order_item_modifiers(
              modifier:modifiers(name)
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!order) {
    return <div className="p-8 text-center">Order not found</div>
  }

  return (
    <div className="p-4 max-w-2xl mx-auto print:p-0">
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5cm;
            size: 80mm auto;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="border-2 border-black p-4 print:border-0">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
          <h1 className="text-2xl font-bold">KITCHEN TICKET</h1>
          <div className="text-sm mt-1">{new Date().toLocaleString()}</div>
        </div>

        {/* Order Info */}
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold">Order:</span>
            <span>{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Table:</span>
            <span>{order.session?.table?.table_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Type:</span>
            <span className="uppercase">{order.session?.order_type || 'dine_in'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Source:</span>
            <span className="uppercase">{order.source}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t-2 border-dashed border-gray-800 pt-3">
          <h2 className="font-bold text-lg mb-3">ITEMS:</h2>
          {order.order_items?.map((item: any, idx: number) => (
            <div key={idx} className="mb-4 pb-3 border-b border-gray-300 last:border-0">
              <div className="flex items-start">
                <span className="font-bold text-xl mr-2">{item.quantity}x</span>
                <div className="flex-1">
                  <div className="font-semibold text-lg">{item.menu_item?.name}</div>
                  
                  {/* Modifiers */}
                  {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.order_item_modifiers.map((mod: any, modIdx: number) => (
                        <div key={modIdx} className="text-sm text-gray-700">
                          + {mod.modifier?.name}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Notes */}
                  {item.notes && (
                    <div className="ml-4 mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded">
                      <div className="font-semibold text-sm">NOTE:</div>
                      <div className="text-sm">{item.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-dashed border-gray-800 pt-3 mt-4 text-center">
          <div className="text-sm text-gray-600">
            Printed: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
