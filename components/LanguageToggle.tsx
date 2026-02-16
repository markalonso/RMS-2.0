'use client'

import { useLanguage } from '@/lib/LanguageContext'
import { translate } from '@/lib/i18n'

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">
        {translate('common.language', language)}:
      </span>
      <button
        onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {language === 'en' ? translate('common.arabic', language) : translate('common.english', language)}
      </button>
    </div>
  )
}
