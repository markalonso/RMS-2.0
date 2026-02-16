'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import Link from 'next/link'
import { use } from 'react'

export default function TablePage({ params }: { params: Promise<{ tableNumber: string }> }) {
  const { language } = useLanguage()
  const { tableNumber } = use(params)

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

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Menu (English Only)
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">Burger</h3>
                <p className="text-gray-600 text-sm mt-1">Delicious beef burger with cheese</p>
              </div>
              <span className="text-lg font-bold text-gray-900">$12.99</span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">Pizza</h3>
                <p className="text-gray-600 text-sm mt-1">Classic Margherita pizza</p>
              </div>
              <span className="text-lg font-bold text-gray-900">$15.99</span>
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">Pasta</h3>
                <p className="text-gray-600 text-sm mt-1">Creamy Alfredo pasta</p>
              </div>
              <span className="text-lg font-bold text-gray-900">$13.99</span>
            </div>
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <Link 
            href="/pos"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {translate('nav.pos', language)}
          </Link>
          <button 
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  )
}
