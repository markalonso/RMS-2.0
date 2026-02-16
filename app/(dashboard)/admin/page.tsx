'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'
import Link from 'next/link'

export default function AdminPage() {
  const { language } = useLanguage()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {translate('admin.title', language)}
        </h1>
        <p className="text-gray-600">
          {translate('admin.description', language)}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Admin Controls
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900">Menu Management</h3>
            <p className="text-blue-700 text-sm mt-1">Manage your restaurant menu items</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900">Staff Management</h3>
            <p className="text-green-700 text-sm mt-1">Manage restaurant staff and roles</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900">Reports & Analytics</h3>
            <p className="text-purple-700 text-sm mt-1">View sales reports and analytics</p>
          </div>
        </div>
        <div className="mt-6">
          <Link 
            href="/pos"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {translate('nav.pos', language)}
          </Link>
        </div>
      </div>
    </div>
  )
}
