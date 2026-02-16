export type Language = 'en' | 'ar'

export interface Translations {
  [key: string]: {
    en: string
    ar: string
  }
}

export const translations: Translations = {
  // Navigation
  'nav.pos': {
    en: 'POS',
    ar: 'نقطة البيع'
  },
  'nav.admin': {
    en: 'Admin',
    ar: 'الإدارة'
  },
  'nav.tables': {
    en: 'Tables',
    ar: 'الطاولات'
  },
  
  // Common
  'common.welcome': {
    en: 'Welcome',
    ar: 'مرحباً'
  },
  'common.language': {
    en: 'Language',
    ar: 'اللغة'
  },
  'common.english': {
    en: 'English',
    ar: 'الإنجليزية'
  },
  'common.arabic': {
    en: 'العربية',
    ar: 'العربية'
  },
  
  // POS Page
  'pos.title': {
    en: 'Point of Sale',
    ar: 'نقطة البيع'
  },
  'pos.description': {
    en: 'Restaurant Management System',
    ar: 'نظام إدارة المطعم'
  },
  
  // Admin Page
  'admin.title': {
    en: 'Admin Dashboard',
    ar: 'لوحة التحكم'
  },
  'admin.description': {
    en: 'Manage your restaurant',
    ar: 'إدارة مطعمك'
  },
  
  // Table Page
  'table.title': {
    en: 'Table',
    ar: 'الطاولة'
  },
  'table.order': {
    en: 'Place Order',
    ar: 'إضافة طلب'
  },
}

export const translate = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || key
}
