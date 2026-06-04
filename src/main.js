const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// Import database logic. We will modify database.js to export an init function.
const dbManager = require('./db/database');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Security fix
      contextIsolation: true  // Security fix
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
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

ipcMain.handle('db-submit-order', async (event, cart) => {
    return await dbManager.submitOrder(cart);
});

ipcMain.handle('check-license', async () => {
    return await dbManager.checkLicense();
});

ipcMain.handle('activate-license', async (event, key) => {
    return await dbManager.activateLicense(key);
});
