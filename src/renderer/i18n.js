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
        desserts: "حلويات"
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
