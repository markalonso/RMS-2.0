'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { formatPrice } from '@/utils/helpers'

interface PageProps {
  params: Promise<{ billId: string }>
}

export default function ReceiptPage({ params }: PageProps) {
  const { billId } = use(params)
  const [bill, setBill] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBill()
  }, [billId])

  useEffect(() => {
    if (bill && !loading) {
      // Auto-print when page loads
      window.print()
    }
  }, [bill, loading])

  const loadBill = async () => {
    try {
      console.log('[Receipt] Loading bill:', billId)
      
      const { data, error } = await supabase
        .from('bills')
        .select(`
          *,
          session:sessions(
            table:tables(table_number),
            order_type,
            customer_name,
            customer_phone,
            delivery_address
          ),
          payment:payments(
            payment_method,
            amount_paid,
            change_given
          ),
          orders(
            order_number,
            order_items(
              *,
              menu_item:menu_items(name),
              order_item_modifiers(
                modifier:modifiers(name, price_adjustment)
              )
            )
          )
        `)
        .eq('id', billId)
        .single()

      if (error) {
        console.error('[Receipt] Error loading bill:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      console.log('[Receipt] Bill loaded successfully:', data?.bill_number)
      setBill(data)
    } catch (error: any) {
      console.error('[Receipt] Error in loadBill:', error)
      alert(`Failed to load receipt: ${error.message || 'Unknown error'}${error.code ? ` (${error.code})` : ''}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (!bill) {
    return <div className="p-8 text-center">Bill not found</div>
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

      <div className="border-2 border-black p-4 print:border-0 font-mono">
        {/* Header */}
        <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
          <h1 className="text-2xl font-bold">RECEIPT</h1>
          <div className="text-lg font-semibold mt-1">Restaurant RMS</div>
          <div className="text-sm mt-1">{new Date().toLocaleString()}</div>
        </div>

        {/* Bill Info */}
        <div className="space-y-1 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="font-semibold">Bill No:</span>
            <span>{bill.bill_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Table:</span>
            <span>{bill.session?.table?.table_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Type:</span>
            <span className="uppercase">{bill.session?.order_type || 'dine_in'}</span>
          </div>
          
          {bill.session?.order_type === 'delivery' && (
            <>
              {bill.session.customer_name && (
                <div className="flex justify-between">
                  <span className="font-semibold">Customer:</span>
                  <span>{bill.session.customer_name}</span>
                </div>
              )}
              {bill.session.customer_phone && (
                <div className="flex justify-between">
                  <span className="font-semibold">Phone:</span>
                  <span>{bill.session.customer_phone}</span>
                </div>
              )}
              {bill.session.delivery_address && (
                <div className="text-xs mt-1">
                  <span className="font-semibold">Address:</span> {bill.session.delivery_address}
                </div>
              )}
            </>
          )}
        </div>

        {/* Items */}
        <div className="border-t-2 border-dashed border-gray-800 pt-3">
          <div className="space-y-2">
            {bill.orders?.flatMap((order: any) => order.order_items || []).map((item: any, idx: number) => (
              <div key={idx} className="text-sm">
                <div className="flex justify-between">
                  <span>
                    {item.quantity}x {item.menu_item?.name}
                  </span>
                  <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                </div>
                
                {/* Modifiers */}
                {item.order_item_modifiers && item.order_item_modifiers.length > 0 && (
                  <div className="ml-4 text-xs text-gray-700">
                    {item.order_item_modifiers.map((mod: any, modIdx: number) => (
                      <div key={modIdx} className="flex justify-between">
                        <span>+ {mod.modifier?.name}</span>
                        {mod.modifier?.price_adjustment !== 0 && (
                          <span>{formatPrice(mod.modifier.price_adjustment * item.quantity)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-dashed border-gray-800 mt-3 pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatPrice(bill.subtotal)}</span>
          </div>
          
          {bill.discount_amount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount ({bill.discount_percent || 0}%):</span>
              <span>-{formatPrice(bill.discount_amount)}</span>
            </div>
          )}
          
          {bill.tax_amount > 0 && (
            <div className="flex justify-between">
              <span>Tax (14%):</span>
              <span>{formatPrice(bill.tax_amount)}</span>
            </div>
          )}
          
          {bill.delivery_fee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span>{formatPrice(bill.delivery_fee)}</span>
            </div>
          )}
          
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>TOTAL:</span>
            <span>{formatPrice(bill.total)}</span>
          </div>
        </div>

        {/* Payment */}
        {bill.payment && bill.payment.length > 0 && (
          <div className="border-t-2 border-dashed border-gray-800 mt-3 pt-3 space-y-1 text-sm">
            {bill.payment.map((payment: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span className="capitalize">{payment.payment_method}:</span>
                  <span>{formatPrice(payment.amount_paid)}</span>
                </div>
                {payment.change_given > 0 && (
                  <div className="flex justify-between font-semibold">
                    <span>Change:</span>
                    <span>{formatPrice(payment.change_given)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-dashed border-gray-800 pt-3 mt-4 text-center text-sm">
          <div className="font-semibold mb-1">Thank You For Your Visit!</div>
          <div className="text-xs text-gray-600">
            Printed: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}
