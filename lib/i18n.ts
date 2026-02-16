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
  'common.loading': {
    en: 'Loading...',
    ar: 'جاري التحميل...'
  },
  'common.error': {
    en: 'Error',
    ar: 'خطأ'
  },
  'common.add': {
    en: 'Add',
    ar: 'إضافة'
  },
  'common.remove': {
    en: 'Remove',
    ar: 'إزالة'
  },
  'common.cancel': {
    en: 'Cancel',
    ar: 'إلغاء'
  },
  'common.confirm': {
    en: 'Confirm',
    ar: 'تأكيد'
  },
  'common.close': {
    en: 'Close',
    ar: 'إغلاق'
  },
  'common.notes': {
    en: 'Notes',
    ar: 'ملاحظات'
  },
  'common.optional': {
    en: 'Optional',
    ar: 'اختياري'
  },
  'common.required': {
    en: 'Required',
    ar: 'مطلوب'
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
  
  // Table Page - QR Ordering
  'table.title': {
    en: 'Table',
    ar: 'الطاولة'
  },
  'table.order': {
    en: 'Place Order',
    ar: 'إضافة طلب'
  },
  'table.disabled': {
    en: 'QR Ordering Disabled',
    ar: 'الطلب عبر QR معطل'
  },
  'table.disabledMessage': {
    en: 'This table does not support QR ordering. Please contact staff for assistance.',
    ar: 'هذه الطاولة لا تدعم الطلب عبر رمز QR. يرجى الاتصال بالموظفين للمساعدة.'
  },
  'table.notActive': {
    en: 'Table Not Active',
    ar: 'الطاولة غير نشطة'
  },
  'table.notActiveMessage': {
    en: 'This table does not have an active session. Please contact staff to start your order.',
    ar: 'هذه الطاولة ليس لديها جلسة نشطة. يرجى الاتصال بالموظفين لبدء طلبك.'
  },
  'table.menu': {
    en: 'Menu (English Only)',
    ar: 'القائمة (بالإنجليزية فقط)'
  },
  'table.categories': {
    en: 'Categories',
    ar: 'الفئات'
  },
  'table.all': {
    en: 'All',
    ar: 'الكل'
  },
  'table.cart': {
    en: 'Your Order',
    ar: 'طلبك'
  },
  'table.cartEmpty': {
    en: 'Your cart is empty',
    ar: 'سلتك فارغة'
  },
  'table.addToCart': {
    en: 'Add to Cart',
    ar: 'إضافة للسلة'
  },
  'table.quantity': {
    en: 'Quantity',
    ar: 'الكمية'
  },
  'table.modifiers': {
    en: 'Customizations',
    ar: 'التخصيصات'
  },
  'table.addNotes': {
    en: 'Add special instructions',
    ar: 'أضف تعليمات خاصة'
  },
  'table.submitOrder': {
    en: 'Submit Order Request',
    ar: 'إرسال طلب الطعام'
  },
  'table.submitting': {
    en: 'Submitting...',
    ar: 'جاري الإرسال...'
  },
  'table.orderSuccess': {
    en: 'Order Submitted Successfully!',
    ar: 'تم إرسال الطلب بنجاح!'
  },
  'table.orderSuccessMessage': {
    en: 'Your order request has been sent to the kitchen. Staff will review and confirm your order shortly.',
    ar: 'تم إرسال طلبك إلى المطبخ. سيقوم الموظفون بمراجعة وتأكيد طلبك قريباً.'
  },
  'table.orderError': {
    en: 'Failed to Submit Order',
    ar: 'فشل إرسال الطلب'
  },
  'table.orderErrorMessage': {
    en: 'There was an error submitting your order. Please try again or contact staff.',
    ar: 'حدث خطأ أثناء إرسال طلبك. يرجى المحاولة مرة أخرى أو الاتصال بالموظفين.'
  },
  'table.selectAtLeast': {
    en: 'Select at least',
    ar: 'اختر على الأقل'
  },
  'table.selectUpTo': {
    en: 'Select up to',
    ar: 'اختر حتى'
  },
  'table.items': {
    en: 'items',
    ar: 'عناصر'
  },
  'table.item': {
    en: 'item',
    ar: 'عنصر'
  },
  'table.unavailable': {
    en: 'Currently Unavailable',
    ar: 'غير متوفر حالياً'
  },
}

export const translate = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || key
}
