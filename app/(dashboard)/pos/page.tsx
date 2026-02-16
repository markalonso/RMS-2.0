'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import Link from 'next/link'

export default function POSPage() {
  const { language } = useLanguage()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {translate('pos.title', language)}
        </h1>
        <p className="text-gray-600">
          {translate('pos.description', language)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link 
          href="/admin"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {translate('nav.admin', language)}
          </h2>
          <p className="text-gray-600">
            {translate('admin.description', language)}
          </p>
        </Link>

        <Link 
          href="/table/1"
          className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {translate('table.title', language)} 1
          </h2>
          <p className="text-gray-600">
            {translate('table.order', language)}
          </p>
        </Link>

        <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            More Features
          </h2>
          <p className="text-gray-500">
            Coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}
