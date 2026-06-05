async function checkLicense() {
    try {
        const result = await window.api.checkLicense();
        const licenseStatusSpan = document.getElementById('license-status');
        const modal = document.getElementById('license-modal');
        const mainPos = document.getElementById('main-pos');

        if (result.valid) {
            licenseStatusSpan.setAttribute('data-i18n', 'licensed');
            licenseStatusSpan.textContent = window.t('licensed');
            licenseStatusSpan.style.color = "#4CAF50";
            modal.style.display = "none";
            // Do not show app container yet, let login screen handle it
        } else {
            licenseStatusSpan.setAttribute('data-i18n', 'unlicensed');
            licenseStatusSpan.textContent = window.t('unlicensed');
            licenseStatusSpan.style.color = "#F44336";
            modal.style.display = "flex";
            document.getElementById('app-container').style.display = "none";
            document.getElementById('login-screen').style.display = "none";
        }
    } catch (e) {
        console.error("License check error:", e);
    }
}

document.getElementById('activate-btn').addEventListener('click', async () => {
    const key = document.getElementById('serial-key-input').value.trim();
    const errorMsg = document.getElementById('license-error');

    try {
        const res = await window.api.activateLicense(key);
        if (res.success) {
            alert(window.t('activation_success'));
            errorMsg.style.display = "none";
            checkLicense();
        } else {
            errorMsg.textContent = window.t('invalid_key');
            errorMsg.style.display = "block";
        }
    } catch(e) {
        errorMsg.textContent = window.t('db_error');
        errorMsg.style.display = "block";
    }
});

// Run check on load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize default language
    window.setLanguage('ar'); // Set to Arabic as requested by user's preference
    checkLicense();
});
