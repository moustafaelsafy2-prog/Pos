const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getCategories: () => ipcRenderer.invoke('db-get-categories'),
    getItems: () => ipcRenderer.invoke('db-get-items'),
    submitOrder: (cart, orderType, customerId, paymentMethod, discount) => ipcRenderer.invoke('db-submit-order', cart, orderType, customerId, paymentMethod, discount),
    getCustomer: (phone) => ipcRenderer.invoke('db-get-customer', phone),
    saveCustomer: (customer) => ipcRenderer.invoke('db-save-customer', customer),
    getDashboardStats: () => ipcRenderer.invoke('db-get-dashboard-stats'),
    checkLicense: () => ipcRenderer.invoke('check-license'),
    activateLicense: (key) => ipcRenderer.invoke('activate-license', key)
});
