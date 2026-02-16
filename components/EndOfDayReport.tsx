'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { BusinessDay } from '@/types'
import { formatPrice } from '@/utils/helpers'
import { translate } from '@/lib/i18n'
import { Language } from '@/lib/i18n'

interface EndOfDayReportProps {
  businessDay: BusinessDay
  language: Language
  onClose: () => void
}

interface ReportData {
  totalOrders: number
  qrOrders: number
  manualOrders: number
  totalSales: number
  totalDiscount: number
  totalTax: number
  totalDeliveryFees: number
  netSales: number
  cashPayments: number
  cardPayments: number
  transferPayments: number
  walletPayments: number
  dineInSessions: number
  takeawaySessions: number
  deliverySessions: number
  averageOrderValue: number
}

export default function EndOfDayReport({ businessDay, language, onClose }: EndOfDayReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportData()
  }, [businessDay.id])

  const loadReportData = async () => {
    // Get all orders for this business day
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('business_day_id', businessDay.id)

    // Get all sessions for this business day
    const { data: sessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('business_day_id', businessDay.id)

    // Get all bills for this business day
    const { data: bills } = await supabase
      .from('bills')
      .select('*')
      .eq('business_day_id', businessDay.id)
      .eq('is_paid', true)

    // Get all payments for this business day
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('business_day_id', businessDay.id)

    // Calculate statistics
    const totalOrders = orders?.length || 0
    const qrOrders = orders?.filter(o => o.source === 'qr').length || 0
    const manualOrders = orders?.filter(o => o.source === 'manual').length || 0

    const totalSales = bills?.reduce((sum, bill) => sum + bill.subtotal, 0) || 0
    const totalDiscount = bills?.reduce((sum, bill) => sum + bill.discount_amount, 0) || 0
    const totalTax = bills?.reduce((sum, bill) => sum + bill.tax_amount, 0) || 0
    const totalDeliveryFees = bills?.reduce((sum, bill) => sum + bill.delivery_fee, 0) || 0
    const netSales = bills?.reduce((sum, bill) => sum + bill.total, 0) || 0

    const cashPayments = payments?.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.amount, 0) || 0
    const cardPayments = payments?.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + p.amount, 0) || 0
    const transferPayments = payments?.filter(p => p.payment_method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0) || 0
    const walletPayments = payments?.filter(p => p.payment_method === 'mobile_wallet').reduce((sum, p) => sum + p.amount, 0) || 0

    const dineInSessions = sessions?.filter(s => s.order_type === 'dine_in').length || 0
    const takeawaySessions = sessions?.filter(s => s.order_type === 'takeaway').length || 0
    const deliverySessions = sessions?.filter(s => s.order_type === 'delivery').length || 0

    const averageOrderValue = bills && bills.length > 0 ? netSales / bills.length : 0

    setReportData({
      totalOrders,
      qrOrders,
      manualOrders,
      totalSales,
      totalDiscount,
      totalTax,
      totalDeliveryFees,
      netSales,
      cashPayments,
      cardPayments,
      transferPayments,
      walletPayments,
      dineInSessions,
      takeawaySessions,
      deliverySessions,
      averageOrderValue
    })
    setLoading(false)
  }

  const printReport = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-lg">{translate('common.loading', language)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 print:mb-4">
          <h2 className="text-2xl font-bold">{translate('pos.endOfDay', language)}</h2>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={printReport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Print Report
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {reportData && (
          <div className="space-y-6">
            {/* Business Day Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Business Day Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Opened:</span> {new Date(businessDay.opened_at).toLocaleString()}
                </div>
                <div>
                  <span className="text-gray-600">Status:</span> {businessDay.status}
                </div>
                <div>
                  <span className="text-gray-600">Opening Cash:</span> {formatPrice(businessDay.opening_cash)}
                </div>
                {businessDay.closing_cash && (
                  <>
                    <div>
                      <span className="text-gray-600">Closing Cash:</span> {formatPrice(businessDay.closing_cash)}
                    </div>
                    <div>
                      <span className="text-gray-600">Expected Cash:</span> {formatPrice(businessDay.expected_cash || 0)}
                    </div>
                    <div>
                      <span className="text-gray-600">Difference:</span>{' '}
                      <span className={businessDay.cash_difference && businessDay.cash_difference < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatPrice(businessDay.cash_difference || 0)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sales Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Sales Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gross Sales:</span>
                  <span className="font-medium">{formatPrice(reportData.totalSales)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Discounts:</span>
                  <span>-{formatPrice(reportData.totalDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Collected:</span>
                  <span className="font-medium">{formatPrice(reportData.totalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fees:</span>
                  <span className="font-medium">{formatPrice(reportData.totalDeliveryFees)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Net Sales:</span>
                  <span>{formatPrice(reportData.netSales)}</span>
                </div>
              </div>
            </div>

            {/* Orders Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Orders</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Orders:</span>
                    <span className="font-medium">{reportData.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>QR Orders:</span>
                    <span>{reportData.qrOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Orders:</span>
                    <span>{reportData.manualOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Order:</span>
                    <span className="font-medium">{formatPrice(reportData.averageOrderValue)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Sessions</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Dine-in:</span>
                    <span className="font-medium">{reportData.dineInSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Takeaway:</span>
                    <span className="font-medium">{reportData.takeawaySessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery:</span>
                    <span className="font-medium">{reportData.deliverySessions}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Payment Methods</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span>{translate('pos.cash', language)}:</span>
                  <span className="font-medium">{formatPrice(reportData.cashPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate('pos.card', language)}:</span>
                  <span className="font-medium">{formatPrice(reportData.cardPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate('pos.bankTransfer', language)}:</span>
                  <span className="font-medium">{formatPrice(reportData.transferPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{translate('pos.mobileWallet', language)}:</span>
                  <span className="font-medium">{formatPrice(reportData.walletPayments)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500 print:mt-8">
          Report generated on {new Date().toLocaleString()}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .fixed.inset-0 {
            position: relative !important;
            background: white !important;
          }
          .fixed.inset-0 * {
            visibility: visible !important;
          }
          .fixed.inset-0 {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}
