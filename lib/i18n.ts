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
  'admin.dashboardDesc': {
    en: 'Manage your restaurant',
    ar: 'إدارة مطعمك'
  },

  // Admin Dashboard
  'admin.menu': {
    en: 'Menu Management',
    ar: 'إدارة القائمة'
  },
  'admin.modifiers': {
    en: 'Modifier Management',
    ar: 'إدارة الإضافات'
  },
  'admin.inventory': {
    en: 'Inventory Management',
    ar: 'إدارة المخزون'
  },
  'admin.purchases': {
    en: 'Purchases',
    ar: 'المشتريات'
  },
  'admin.expenses': {
    en: 'Expenses',
    ar: 'المصروفات'
  },
  'admin.waste': {
    en: 'Waste Logs',
    ar: 'سجلات الهدر'
  },
  'admin.reports': {
    en: 'Reports',
    ar: 'التقارير'
  },
  'admin.categories': {
    en: 'Categories',
    ar: 'الفئات'
  },
  'admin.items': {
    en: 'Menu Items',
    ar: 'عناصر القائمة'
  },
  'admin.ingredients': {
    en: 'Ingredients',
    ar: 'المكونات'
  },
  'admin.recipes': {
    en: 'Recipes',
    ar: 'الوصفات'
  },
  'admin.addNew': {
    en: 'Add New',
    ar: 'إضافة جديد'
  },
  'admin.edit': {
    en: 'Edit',
    ar: 'تعديل'
  },
  'admin.delete': {
    en: 'Delete',
    ar: 'حذف'
  },
  'admin.save': {
    en: 'Save',
    ar: 'حفظ'
  },
  'admin.name': {
    en: 'Name',
    ar: 'الاسم'
  },
  'admin.description': {
    en: 'Description',
    ar: 'الوصف'
  },
  'admin.price': {
    en: 'Price',
    ar: 'السعر'
  },
  'admin.category': {
    en: 'Category',
    ar: 'الفئة'
  },
  'admin.available': {
    en: 'Available',
    ar: 'متاح'
  },
  'admin.unavailable': {
    en: 'Unavailable',
    ar: 'غير متاح'
  },
  'admin.active': {
    en: 'Active',
    ar: 'نشط'
  },
  'admin.inactive': {
    en: 'Inactive',
    ar: 'غير نشط'
  },
  'admin.displayOrder': {
    en: 'Display Order',
    ar: 'ترتيب العرض'
  },
  'admin.minSelection': {
    en: 'Min Selection',
    ar: 'الحد الأدنى'
  },
  'admin.maxSelection': {
    en: 'Max Selection',
    ar: 'الحد الأقصى'
  },
  'admin.required': {
    en: 'Required',
    ar: 'مطلوب'
  },
  'admin.priceAdjustment': {
    en: 'Price Adjustment',
    ar: 'تعديل السعر'
  },
  'admin.unit': {
    en: 'Unit',
    ar: 'الوحدة'
  },
  'admin.currentQuantity': {
    en: 'Current Quantity',
    ar: 'الكمية الحالية'
  },
  'admin.minQuantity': {
    en: 'Min Quantity',
    ar: 'الحد الأدنى'
  },
  'admin.unitCost': {
    en: 'Unit Cost',
    ar: 'تكلفة الوحدة'
  },
  'admin.supplier': {
    en: 'Supplier',
    ar: 'المورد'
  },
  'admin.invoiceNumber': {
    en: 'Invoice Number',
    ar: 'رقم الفاتورة'
  },
  'admin.invoiceDate': {
    en: 'Invoice Date',
    ar: 'تاريخ الفاتورة'
  },
  'admin.totalAmount': {
    en: 'Total Amount',
    ar: 'المبلغ الإجمالي'
  },
  'admin.paid': {
    en: 'Paid',
    ar: 'مدفوع'
  },
  'admin.unpaid': {
    en: 'Unpaid',
    ar: 'غير مدفوع'
  },
  'admin.expenseType': {
    en: 'Expense Type',
    ar: 'نوع المصروف'
  },
  'admin.operational': {
    en: 'Operational',
    ar: 'تشغيلي'
  },
  'admin.administrative': {
    en: 'Administrative',
    ar: 'إداري'
  },
  'admin.amount': {
    en: 'Amount',
    ar: 'المبلغ'
  },
  'admin.date': {
    en: 'Date',
    ar: 'التاريخ'
  },
  'admin.reason': {
    en: 'Reason',
    ar: 'السبب'
  },
  'admin.quantity': {
    en: 'Quantity',
    ar: 'الكمية'
  },
  'admin.cost': {
    en: 'Cost',
    ar: 'التكلفة'
  },
  'admin.businessDayReports': {
    en: 'Business Day Reports',
    ar: 'تقارير يوم العمل'
  },
  'admin.salesByType': {
    en: 'Sales by Order Type',
    ar: 'المبيعات حسب نوع الطلب'
  },
  'admin.taxCollected': {
    en: 'Tax Collected',
    ar: 'الضرائب المحصلة'
  },
  'admin.profitEstimate': {
    en: 'Profit Estimate',
    ar: 'تقدير الربح'
  },
  'admin.totalSales': {
    en: 'Total Sales',
    ar: 'إجمالي المبيعات'
  },
  'admin.cogs': {
    en: 'Cost of Goods Sold',
    ar: 'تكلفة البضائع المباعة'
  },
  'admin.grossProfit': {
    en: 'Gross Profit',
    ar: 'إجمالي الربح'
  },
  'admin.netProfit': {
    en: 'Net Profit',
    ar: 'صافي الربح'
  },
  'admin.lowStock': {
    en: 'Low Stock Alert',
    ar: 'تنبيه نقص المخزون'
  },
  'admin.reorderLevel': {
    en: 'Reorder Level',
    ar: 'مستوى إعادة الطلب'
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
  'pos.maxOwnerDiscount': {
    en: 'Owner discount limit is 30%',
    ar: 'حد خصم المالك هو 30%'
  },
  'pos.fillRequired': {
    en: 'Please fill in all required fields',
    ar: 'يرجى ملء جميع الحقول المطلوبة'
  },
}

export const translate = (key: string, lang: Language): string => {
  return translations[key]?.[lang] || key
}
