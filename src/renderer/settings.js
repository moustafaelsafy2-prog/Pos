// Handle General Settings (Placeholder logic connecting to new IPC and DB later)
async function loadSettingsData() {
    try {
        const settings = await window.api.getSettings();
        if (settings) {
            document.getElementById('store-name').value = settings.store_name || '';
            document.getElementById('tax-number').value = settings.tax_number || '';
        }
    } catch (e) {
        console.error("Failed to load settings data:", e);
    }
}

document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const storeName = document.getElementById('store-name').value.trim();
    const taxNumber = document.getElementById('tax-number').value.trim();

    try {
        await window.api.saveSettings(storeName, taxNumber);
        alert(window.t('save_success') || "Saved successfully!");
    } catch (e) {
        console.error("Failed to save settings:", e);
    }
});

window.loadSettingsData = loadSettingsData;
