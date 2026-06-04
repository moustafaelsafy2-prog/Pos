const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dbManager = require('./db/database');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  // Initialize DB in the main process
  dbManager.initDb(app.getPath('userData'));

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Renderer to Main communication
ipcMain.handle('db-get-categories', async () => {
    return await dbManager.getCategories();
});

ipcMain.handle('db-get-items', async () => {
    return await dbManager.getItems();
});

ipcMain.handle('db-submit-order', async (event, cart, orderType, customerId, paymentMethod, discount) => {
    return await dbManager.submitOrder(cart, orderType, customerId, paymentMethod, discount);
});

ipcMain.handle('db-get-customer', async (event, phone) => {
    return await dbManager.getCustomerByPhone(phone);
});

ipcMain.handle('db-save-customer', async (event, customer) => {
    return await dbManager.saveCustomer(customer);
});

ipcMain.handle('db-get-dashboard-stats', async () => {
    return await dbManager.getDashboardStats();
});

ipcMain.handle('db-get-inventory', async () => {
    return await dbManager.getInventory();
});

ipcMain.handle('check-license', async () => {
    return await dbManager.checkLicense();
});

ipcMain.handle('activate-license', async (event, key) => {
    return await dbManager.activateLicense(key);
});
