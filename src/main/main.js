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

ipcMain.handle('db-get-all-customers', async () => {
    return await dbManager.getAllCustomers();
});

ipcMain.handle('db-get-customer-orders', async (event, customerId) => {
    return await dbManager.getCustomerOrders(customerId);
});

ipcMain.handle('db-get-pending-orders', async () => {
    return await dbManager.getPendingOrders();
});

ipcMain.handle('db-get-today-orders', async () => {
    return await dbManager.getTodayOrders();
});

ipcMain.handle('db-mark-order-ready', async (event, orderId) => {
    return await dbManager.markOrderReady(orderId);
});

ipcMain.handle('db-refund-order', async (event, orderId) => {
    return await dbManager.refundOrder(orderId);
});

ipcMain.handle('db-save-customer', async (event, customer) => {
    return await dbManager.saveCustomer(customer);
});

ipcMain.handle('db-get-dashboard-stats', async (event, startDate, endDate) => {
    return await dbManager.getDashboardStats(startDate, endDate);
});

ipcMain.handle('db-get-inventory', async () => {
    return await dbManager.getInventory();
});

ipcMain.handle('db-add-inventory', async (event, name, unit, stock, threshold) => {
    return await dbManager.addInventoryItem(name, unit, stock, threshold);
});

ipcMain.handle('db-add-menu-item', async (event, catId, name, price, img) => {
    return await dbManager.addMenuItem(catId, name, price, img);
});

ipcMain.handle('db-add-recipe', async (event, itemId, invId, qty) => {
    return await dbManager.addRecipe(itemId, invId, qty);
});

ipcMain.handle('db-delete-inventory', async (event, id) => {
    return await dbManager.deleteInventoryItem(id);
});

ipcMain.handle('db-delete-menu-item', async (event, id) => {
    return await dbManager.deleteMenuItem(id);
});

ipcMain.handle('db-update-inventory', async (event, id, name, unit, stock, threshold) => {
    return await dbManager.updateInventoryItem(id, name, unit, stock, threshold);
});

ipcMain.handle('db-update-menu-item', async (event, id, catId, name, price, img) => {
    return await dbManager.updateMenuItem(id, catId, name, price, img);
});

ipcMain.handle('db-get-settings', async () => {
    return await dbManager.getSettings();
});

ipcMain.handle('db-save-settings', async (event, storeName, taxNumber) => {
    return await dbManager.saveSettings(storeName, taxNumber);
});

ipcMain.handle('db-login-user', async (event, pin) => {
    return await dbManager.loginUser(pin);
});

ipcMain.handle('db-get-users', async () => {
    return await dbManager.getUsers();
});

ipcMain.handle('db-add-user', async (event, name, pin, role) => {
    return await dbManager.addUser(name, pin, role);
});

ipcMain.handle('db-delete-user', async (event, id) => {
    return await dbManager.deleteUser(id);
});

ipcMain.handle('db-get-drivers', async () => {
    return await dbManager.getDrivers();
});

ipcMain.handle('db-add-driver', async (event, name, phone) => {
    return await dbManager.addDriver(name, phone);
});

ipcMain.handle('db-delete-driver', async (event, id) => {
    return await dbManager.deleteDriver(id);
});

ipcMain.handle('db-get-unassigned-deliveries', async () => {
    return await dbManager.getUnassignedDeliveries();
});

ipcMain.handle('db-assign-driver', async (event, orderId, driverId) => {
    return await dbManager.assignDriver(orderId, driverId);
});

ipcMain.handle('db-get-driver-settlements', async () => {
    return await dbManager.getDriverSettlements();
});

ipcMain.handle('db-settle-driver', async (event, driverId) => {
    return await dbManager.settleDriver(driverId);
});

ipcMain.handle('db-open-shift', async (event, name, cash) => {
    return await dbManager.openShift(name, cash);
});

ipcMain.handle('db-get-shift', async () => {
    return await dbManager.getCurrentShift();
});

ipcMain.handle('db-close-shift', async (event, actualCash, shiftId) => {
    return await dbManager.closeShift(actualCash, shiftId);
});

ipcMain.handle('db-get-z-report', async (event, shiftId) => {
    return await dbManager.getZReport(shiftId);
});

ipcMain.handle('check-license', async () => {
    return await dbManager.checkLicense();
});

ipcMain.handle('activate-license', async (event, key) => {
    return await dbManager.activateLicense(key);
});

ipcMain.handle('db-verify-master-password', async (event, password) => {
    return await dbManager.verifyMasterPassword(password);
});

ipcMain.handle('db-generate-license', async (event, days) => {
    return await dbManager.generateLicenseToken(days);
});

// Helper to easily grab the machine ID for the front end generator
ipcMain.handle('get-machine-id', async () => {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
});
