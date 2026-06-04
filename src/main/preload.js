const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getCategories: () => ipcRenderer.invoke('db-get-categories'),
    getItems: () => ipcRenderer.invoke('db-get-items'),
    submitOrder: (cart, orderType, customerId, paymentMethod, discount) => ipcRenderer.invoke('db-submit-order', cart, orderType, customerId, paymentMethod, discount),
    getCustomer: (phone) => ipcRenderer.invoke('db-get-customer', phone),
    getAllCustomers: () => ipcRenderer.invoke('db-get-all-customers'),
    getCustomerOrders: (customerId) => ipcRenderer.invoke('db-get-customer-orders', customerId),
    saveCustomer: (customer) => ipcRenderer.invoke('db-save-customer', customer),
    getDashboardStats: () => ipcRenderer.invoke('db-get-dashboard-stats'),
    getInventory: () => ipcRenderer.invoke('db-get-inventory'),
    addInventoryItem: (name, unit, stock, thresh) => ipcRenderer.invoke('db-add-inventory', name, unit, stock, thresh),
    addMenuItem: (catId, name, price, img) => ipcRenderer.invoke('db-add-menu-item', catId, name, price, img),
    addRecipe: (itemId, invId, qty) => ipcRenderer.invoke('db-add-recipe', itemId, invId, qty),
    deleteInventoryItem: (id) => ipcRenderer.invoke('db-delete-inventory', id),
    deleteMenuItem: (id) => ipcRenderer.invoke('db-delete-menu-item', id),
    getSettings: () => ipcRenderer.invoke('db-get-settings'),
    saveSettings: (storeName, taxNumber, pin) => ipcRenderer.invoke('db-save-settings', storeName, taxNumber, pin),
    verifyPin: (pin) => ipcRenderer.invoke('db-verify-pin', pin),
    checkLicense: () => ipcRenderer.invoke('check-license'),
    activateLicense: (key) => ipcRenderer.invoke('activate-license', key)
});
