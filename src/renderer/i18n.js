const translations = {
    en: {
        app_title: "Restaurant POS",
        checking_license: "Checking License...",
        licensed: "Licensed",
        unlicensed: "Unlicensed",
        license_activation: "License Activation",
        license_prompt: "Please enter your serial key to activate the POS system.",
        activate_btn: "Activate",
        invalid_key: "Invalid Serial Key.",
        activation_success: "Activation Successful! Valid for 1 year.",
        db_error: "Database error. Please try again.",

        current_order: "Current Order",
        dine_in: "Dine-in",
        takeaway: "Takeaway",
        delivery: "Delivery",

        customer_details: "Customer Details",
        phone_placeholder: "Phone Number",
        search_cust_btn: "Search Customer",
        name_placeholder: "Name",
        address_placeholder: "Address",

        total: "Total:",
        checkout_btn: "Checkout",

        cart_empty: "Cart is empty!",
        enter_phone: "Please enter a phone number",
        cust_not_found: "Customer not found. Please fill in details to create a new one.",
        fill_all_cust: "Please fill all customer details for delivery.",
        save_cust_fail: "Failed to save customer data.",
        checkout_fail: "Failed to submit order. Check console.",
        order_success: "Order #{id} ({type}) completed successfully! Total: ${total}"
    },
    ar: {
        app_title: "نظام نقطة البيع للمطاعم",
        checking_license: "جاري التحقق من الترخيص...",
        licensed: "مفعل",
        unlicensed: "غير مفعل",
        license_activation: "تفعيل الترخيص",
        license_prompt: "الرجاء إدخال السيريال نمبر لتفعيل النظام.",
        activate_btn: "تفعيل",
        invalid_key: "السيريال نمبر غير صحيح.",
        activation_success: "تم التفعيل بنجاح! صالح لمدة سنة.",
        db_error: "خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.",

        current_order: "الطلب الحالي",
        dine_in: "محلي",
        takeaway: "سفري",
        delivery: "توصيل",

        customer_details: "تفاصيل العميل",
        phone_placeholder: "رقم الهاتف",
        search_cust_btn: "بحث عن العميل",
        name_placeholder: "الاسم",
        address_placeholder: "العنوان",

        total: "الإجمالي:",
        checkout_btn: "دفع وإتمام",

        cart_empty: "السلة فارغة!",
        enter_phone: "الرجاء إدخال رقم الهاتف",
        cust_not_found: "لم يتم العثور على العميل. يرجى إدخال التفاصيل لإضافته.",
        fill_all_cust: "الرجاء تعبئة جميع بيانات العميل لطلب التوصيل.",
        save_cust_fail: "فشل في حفظ بيانات العميل.",
        checkout_fail: "فشل في إتمام الطلب. راجع السجل.",
        order_success: "تم إكمال الطلب #{id} ({type}) بنجاح! الإجمالي: ${total}",
        nav_pos: "الكاشير",
        nav_dashboard: "التقارير",
        nav_customers: "العملاء",
        nav_settings: "الإعدادات",
        search_items: "بحث عن صنف...",
        subtotal: "المجموع الفرعي",
        discount: "الخصم",
        tax: "الضريبة (15%)",
        add_discount: "إضافة خصم",
        hold_order: "تعليق الطلب",
        resume_order: "استرجاع",
        payment_title: "اختر طريقة الدفع",
        cash: "كاش",
        card: "شبكة",
        quick_cash: "دفع سريع",
        change_due: "المتبقي للعميل:",
        cancel: "إلغاء",
        confirm_payment: "تأكيد الدفع",
        item_notes: "ملاحظات الصنف",
        enter_notes: "مثال: بدون بصل، زيادة جبن...",
        save: "حفظ",
        refresh: "تحديث",
        total_revenue: "إجمالي الإيرادات",
        total_orders: "إجمالي الطلبات",
        avg_order_value: "متوسط قيمة الطلب",
        sales_by_type: "المبيعات حسب نوع الطلب",
        sales_by_payment: "المبيعات حسب طريقة الدفع",
        top_selling_items: "الأصناف الأكثر مبيعاً",
        nav_inventory: "المخزون",
        item_name: "اسم المكون",
        current_stock: "المخزون الحالي",
        unit: "الوحدة",
        status: "الحالة",
        status_ok: "متاح",
        status_warning: "منخفض",
        status_danger: "نفد",
        add_inventory: "إضافة للمخزون",
        add_menu_item: "إضافة صنف للقائمة",
        link_recipe: "ربط وصفة (لإدارة المخزون)",
        item_name: "اسم الصنف",
        price: "السعر",
        image_url: "رابط الصورة (اختياري)",
        select_category: "اختر الفئة",
        select_menu_item: "اختر صنف القائمة",
        select_inv_item: "اختر مكون المخزون",
        qty_required: "الكمية المطلوبة للوصفة",
        link_recipe_btn: "ربط المكون",
        low_threshold: "حد التنبيه",
        fill_all_fields: "الرجاء تعبئة جميع الحقول",
        save_success: "تم الحفظ بنجاح",
        main_course: "الطبق الرئيسي",
        drinks: "مشروبات",
        desserts: "حلويات",
        nav_menu: "قائمة الطعام",
        general_settings: "إعدادات عامة",
        license_info: "معلومات الترخيص",
        store_name: "اسم المتجر",
        tax_number: "الرقم الضريبي",
        admin_pin: "رمز المدير",
        invalid_pin: "رمز غير صحيح",
        actions: "إجراءات",
        delete: "حذف",
        edit: "تعديل",
        order_history: "أرشيف الطلبات",
        date: "التاريخ",
        close: "إغلاق",
        nav_kds: "شاشة المطبخ",
        ready: "جاهز",
        filter: "تصفية",
        clear_filter: "مسح الفلتر",
        open_shift: "فتح وردية",
        cashier_name: "اسم الكاشير",
        starting_cash: "النقدية في الدرج بداية الوردية",
        start_shift: "بدء الوردية",
        close_shift: "إغلاق الوردية",
        actual_cash: "النقدية الفعلية في الدرج الآن",
        confirm_close: "تأكيد وطباعة تقرير Z",
        nav_orders: "سجل الفواتير",
        today_orders: "فواتير اليوم",
        invoice_no: "رقم الفاتورة",
        time: "الوقت",
        refund: "استرجاع",
        refunded: "مرتجع",
        completed: "مكتمل",
        refund_success: "تم استرجاع الفاتورة بنجاح.",
        confirm_refund: "هل أنت متأكد من استرجاع هذه الفاتورة وإلغائها؟",
        nav_staff: "الموظفين",
        add_staff: "إضافة موظف",
        pin_placeholder: "رمز المرور (4 أرقام)",
        role: "الصلاحية",
        cashier: "كاشير",
        admin: "مدير",
        login: "تسجيل الدخول",
        enter_pin: "أدخل رمز المرور للمتابعة",
        login_btn: "دخول",
        confirm_delete: "هل أنت متأكد من الحذف؟"
    }
};

translations.en.nav_pos = "POS";
translations.en.nav_dashboard = "Dashboard";
translations.en.nav_customers = "Customers";
translations.en.nav_settings = "Settings";
translations.en.search_items = "Search items...";
translations.en.subtotal = "Subtotal";
translations.en.discount = "Discount";
translations.en.tax = "VAT (15%)";
translations.en.add_discount = "Discount";
translations.en.hold_order = "Hold";
translations.en.resume_order = "Resume";
translations.en.payment_title = "Select Payment Method";
translations.en.cash = "Cash";
translations.en.card = "Card";
translations.en.quick_cash = "Quick Cash";
translations.en.change_due = "Change Due:";
translations.en.cancel = "Cancel";
translations.en.confirm_payment = "Confirm Payment";
translations.en.item_notes = "Item Notes";
translations.en.enter_notes = "e.g. No onions, extra cheese...";
translations.en.save = "Save";
translations.en.refresh = "Refresh";
translations.en.total_revenue = "Total Revenue";
translations.en.total_orders = "Total Orders";
translations.en.avg_order_value = "Avg. Order Value";
translations.en.sales_by_type = "Sales by Order Type";
translations.en.sales_by_payment = "Sales by Payment Method";
translations.en.top_selling_items = "Top Selling Items";
translations.en.nav_inventory = "Inventory";
translations.en.item_name = "Item Name";
translations.en.current_stock = "Current Stock";
translations.en.unit = "Unit";
translations.en.status = "Status";
translations.en.status_ok = "In Stock";
translations.en.status_warning = "Low Stock";
translations.en.status_danger = "Out of Stock";
translations.en.add_inventory = "Add Inventory Item";
translations.en.add_menu_item = "Add Menu Item";
translations.en.link_recipe = "Link Recipe (Auto-Deduct)";
translations.en.item_name = "Item Name";
translations.en.price = "Price";
translations.en.image_url = "Image URL (Optional)";
translations.en.select_category = "Select Category";
translations.en.select_menu_item = "Select Menu Item";
translations.en.select_inv_item = "Select Inventory Item";
translations.en.qty_required = "Quantity Required";
translations.en.link_recipe_btn = "Link";
translations.en.low_threshold = "Low Threshold";
translations.en.fill_all_fields = "Please fill all fields";
translations.en.save_success = "Saved Successfully";
translations.en.main_course = "Main Course";
translations.en.drinks = "Drinks";
translations.en.desserts = "Desserts";
translations.en.nav_menu = "Menu";
translations.en.general_settings = "General Settings";
translations.en.license_info = "License Info";
translations.en.store_name = "Store Name";
translations.en.tax_number = "Tax Number";
translations.en.admin_pin = "Admin PIN";
translations.en.invalid_pin = "Invalid PIN";
translations.en.actions = "Actions";
translations.en.delete = "Delete";
translations.en.edit = "Edit";
translations.en.order_history = "Order History";
translations.en.date = "Date";
translations.en.close = "Close";
translations.en.nav_kds = "Kitchen";
translations.en.ready = "Ready";
translations.en.filter = "Filter";
translations.en.clear_filter = "Clear";
translations.en.open_shift = "Open Shift";
translations.en.cashier_name = "Cashier Name";
translations.en.starting_cash = "Starting Cash in Drawer";
translations.en.start_shift = "Start Shift";
translations.en.close_shift = "Close Shift";
translations.en.actual_cash = "Actual Cash in Drawer";
translations.en.confirm_close = "Confirm & Print Z-Report";
translations.en.nav_orders = "Orders";
translations.en.today_orders = "Today's Orders";
translations.en.invoice_no = "Invoice #";
translations.en.time = "Time";
translations.en.refund = "Refund";
translations.en.refunded = "Refunded";
translations.en.completed = "Completed";
translations.en.refund_success = "Order refunded successfully.";
translations.en.confirm_refund = "Are you sure you want to refund this order?";
translations.en.nav_staff = "Staff";
translations.en.add_staff = "Add Staff Member";
translations.en.pin_placeholder = "PIN (4 digits)";
translations.en.role = "Role";
translations.en.cashier = "Cashier";
translations.en.admin = "Admin";
translations.en.login = "Login";
translations.en.enter_pin = "Enter your PIN to continue";
translations.en.login_btn = "Login";
translations.en.confirm_delete = "Are you sure you want to delete?";

let currentLang = 'en';

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // Re-render components if needed (e.g., cart) to update dynamic text
    if (typeof window.renderCart === 'function') {
        window.renderCart();
    }
}

function t(key, params = {}) {
    let str = translations[currentLang][key] || key;
    for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v);
    }
    return str;
}

window.t = t;
window.setLanguage = setLanguage;
window.currentLang = () => currentLang;
