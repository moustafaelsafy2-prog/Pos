const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getCategories: () => ipcRenderer.invoke('db-get-categories'),
    getItems: () => ipcRenderer.invoke('db-get-items'),
    submitOrder: (cart) => ipcRenderer.invoke('db-submit-order', cart),
    checkLicense: () => ipcRenderer.invoke('check-license'),
    activateLicense: (key) => ipcRenderer.invoke('activate-license', key)
});
