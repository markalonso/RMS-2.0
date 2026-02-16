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

  // POS Features
  'pos.tables': {
    en: 'Tables',
    ar: 'الطاولات'
  },
  'pos.openDay': {
    en: 'Open Business Day',
    ar: 'فتح يوم عمل'
  },
  'pos.closeDay': {
    en: 'Close Business Day',
    ar: 'إغلاق يوم عمل'
  },
  'pos.dayOpen': {
    en: 'Day Open',
    ar: 'اليوم مفتوح'
  },
  'pos.dayClosed': {
    en: 'Day Closed',
    ar: 'اليوم مغلق'
  },
  'pos.openingCash': {
    en: 'Opening Cash',
    ar: 'النقد الافتتاحي'
  },
  'pos.closingCash': {
    en: 'Closing Cash',
    ar: 'النقد الختامي'
  },
  'pos.dineIn': {
    en: 'Dine-in',
    ar: 'تناول في المطعم'
  },
  'pos.takeaway': {
    en: 'Takeaway',
    ar: 'طلب خارجي'
  },
  'pos.delivery': {
    en: 'Delivery',
    ar: 'توصيل'
  },
  'pos.available': {
    en: 'Available',
    ar: 'متاح'
  },
  'pos.occupied': {
    en: 'Occupied',
    ar: 'مشغول'
  },
  'pos.pendingOrders': {
    en: 'Pending Orders',
    ar: 'طلبات معلقة'
  },
  'pos.qrEnabled': {
    en: 'QR Enabled',
    ar: 'QR مفعّل'
  },
  'pos.qrDisabled': {
    en: 'QR Disabled',
    ar: 'QR معطل'
  },
  'pos.openSession': {
    en: 'Open Session',
    ar: 'فتح جلسة'
  },
  'pos.newTakeaway': {
    en: 'New Takeaway',
    ar: 'طلب خارجي جديد'
  },
  'pos.newDelivery': {
    en: 'New Delivery',
    ar: 'طلب توصيل جديد'
  },
  'pos.customerName': {
    en: 'Customer Name',
    ar: 'اسم العميل'
  },
  'pos.phone': {
    en: 'Phone',
    ar: 'الهاتف'
  },
  'pos.address': {
    en: 'Address',
    ar: 'العنوان'
  },
  'pos.deliveryFee': {
    en: 'Delivery Fee',
    ar: 'رسوم التوصيل'
  },
  'pos.guestCount': {
    en: 'Guest Count',
    ar: 'عدد الضيوف'
  },
  'pos.accept': {
    en: 'Accept',
    ar: 'قبول'
  },
  'pos.reject': {
    en: 'Reject',
    ar: 'رفض'
  },
  'pos.addItems': {
    en: 'Add Items',
    ar: 'إضافة عناصر'
  },
  'pos.discount': {
    en: 'Discount',
    ar: 'خصم'
  },
  'pos.discountPercent': {
    en: 'Discount %',
    ar: '% خصم'
  },
  'pos.discountAmount': {
    en: 'Discount Amount',
    ar: 'مبلغ الخصم'
  },
  'pos.subtotal': {
    en: 'Subtotal',
    ar: 'المجموع الفرعي'
  },
  'pos.tax': {
    en: 'Tax',
    ar: 'الضريبة'
  },
  'pos.total': {
    en: 'Total',
    ar: 'الإجمالي'
  },
  'pos.printKitchen': {
    en: 'Print Kitchen Ticket',
    ar: 'طباعة تذكرة المطبخ'
  },
  'pos.printReceipt': {
    en: 'Print Receipt',
    ar: 'طباعة إيصال'
  },
  'pos.mergeTables': {
    en: 'Merge Tables',
    ar: 'دمج الطاولات'
  },
  'pos.splitBill': {
    en: 'Split Bill',
    ar: 'تقسيم الفاتورة'
  },
  'pos.pay': {
    en: 'Pay',
    ar: 'دفع'
  },
  'pos.cash': {
    en: 'Cash',
    ar: 'نقداً'
  },
  'pos.card': {
    en: 'Card',
    ar: 'بطاقة'
  },
  'pos.bankTransfer': {
    en: 'Bank Transfer',
    ar: 'تحويل بنكي'
  },
  'pos.mobileWallet': {
    en: 'Mobile Wallet',
    ar: 'محفظة إلكترونية'
  },
  'pos.endOfDay': {
    en: 'End of Day Report',
    ar: 'تقرير نهاية اليوم'
  },
  'pos.viewOrders': {
    en: 'View Orders',
    ar: 'عرض الطلبات'
  },
  'pos.closeAndPay': {
    en: 'Close & Pay',
    ar: 'إغلاق ودفع'
  },
  'pos.noBusinessDay': {
    en: 'No business day is open. Please open a business day to start.',
    ar: 'لا يوجد يوم عمل مفتوح. يرجى فتح يوم عمل للبدء.'
  },
  'pos.paymentTooLow': {
    en: 'Payment amount must be at least the bill total',
    ar: 'يجب أن يكون مبلغ الدفع على الأقل إجمالي الفاتورة'
  },
  'pos.maxDiscount': {
    en: 'Cashiers can only apply up to 15% discount',
    ar: 'يمكن للصرافين تطبيق خصم حتى 15% فقط'
  },
  'pos.fillRequired': {
    en: 'Please fill in all required fields',
    ar: 'يرجى ملء جميع الحقول المطلوبة'
  },
}

export const translate = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || key
}
