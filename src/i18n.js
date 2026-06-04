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
        order_success: "تم إكمال الطلب #{id} ({type}) بنجاح! الإجمالي: ${total}"
    }
};

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
