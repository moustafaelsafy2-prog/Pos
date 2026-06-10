const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const dbManager = require('./db/database');

// --- NETWORK CONFIGURATION & CLIENT-SERVER RPC ---
let networkConfigPath;
let networkConfigInitialized = false;

function initNetworkConfig() {
    networkConfigPath = path.join(app.getPath('userData'), 'networkConfig.json');
    if (!fs.existsSync(networkConfigPath)) {
        fs.writeFileSync(networkConfigPath, JSON.stringify({ mode: 'server', serverIp: '127.0.0.1' }), 'utf8');
    }
    networkConfigInitialized = true;
}

function getNetworkConfig() {
    if (!networkConfigInitialized) initNetworkConfig();
    try {
        const data = fs.readFileSync(networkConfigPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { mode: 'server', serverIp: '127.0.0.1' };
    }
}

function saveNetworkConfig(mode, serverIp) {
    if (!networkConfigInitialized) initNetworkConfig();
    fs.writeFileSync(networkConfigPath, JSON.stringify({ mode, serverIp }), 'utf8');
}

async function callDb(methodName, ...args) {
    const config = getNetworkConfig();
    if (config.mode === 'server') {
        return await dbManager[methodName](...args);
    } else {
        // Client Mode: Forward to Main Server
        return new Promise((resolve, reject) => {
            const cleanArgs = args.filter(a => typeof a !== 'undefined');
            const postData = JSON.stringify({ method: methodName, args: cleanArgs });

            const req = http.request({
                hostname: config.serverIp,
                port: 8080,
                path: '/rpc',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'x-rpc-secret': 'local-restaurant-secret'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error) reject(new Error(parsed.error));
                        else resolve(parsed.result);
                    } catch(e) { reject(e); }
                });
            });
            req.on('error', (e) => reject(new Error("Network Error: Could not reach main server at " + config.serverIp + " - " + e.message)));
            req.write(postData);
            req.end();
        });
    }
}


// --- LOCAL RPC SERVER & WAITER APP (PORT 8080) ---
const http = require('http');



function startRpcServer() {
    const config = getNetworkConfig();
    if (config.mode !== 'server') return;

    const server = http.createServer(async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        // Waiter App UI
        if (req.url === '/' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Waiter App</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .item { padding: 10px; border: 1px solid #ccc; margin-bottom: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;}
                        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; font-size: 16px;}
                        .cart { margin-top: 20px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
                    </style>
                </head>
                <body>
                    <h2>Menu</h2>
                    <div id="menu">Loading...</div>
                    <div class="cart">
                        <h3>Cart <span id="cart-total">$0.00</span></h3>
                        <ul id="cart-items"></ul>
                        <label>Table No:</label>
                        <select id="table-select"><option value="">No Table</option></select><br><br>
                        <button onclick="submitOrder()">Submit Order</button>
                    </div>

                    <script>
                        let cart = [];
                        let menuItems = [];

                        async function loadMenu() {
                            const res = await fetch('/api/items');
                            menuItems = await res.json();
                            const menuDiv = document.getElementById('menu');
                            menuDiv.innerHTML = '';
                            menuItems.forEach(item => {
                                const div = document.createElement('div');
                                div.className = 'item';
                                div.innerHTML = "<span>" + item.name + " - $" + item.price.toFixed(2) + "</span><button onclick='addToCart(" + item.id + ")'>Add</button>";
                                menuDiv.appendChild(div);
                            });
                        }

                        async function loadTables() {
                            const res = await fetch('/api/tables');
                            const tables = await res.json();
                            const select = document.getElementById('table-select');
                            tables.forEach(t => {
                                select.innerHTML += "<option value='" + t.id + "'>" + t.table_number + "</option>";
                            });
                        }

                        function addToCart(id) {
                            const item = menuItems.find(i => i.id === id);
                            const existing = cart.find(c => c.id === id);
                            if (existing) {
                                existing.qty++;
                            } else {
                                cart.push({
                                    id: item.id,
                                    cartItemId: Date.now() + Math.random(),
                                    name: item.name,
                                    price: item.price,
                                    qty: 1
                                });
                            }
                            renderCart();
                        }

                        function renderCart() {
                            const ul = document.getElementById('cart-items');
                            ul.innerHTML = '';
                            let total = 0;
                            cart.forEach(c => {
                                total += c.price * c.qty;
                                ul.innerHTML += "<li>" + c.qty + "x " + c.name + " ($" + (c.price * c.qty).toFixed(2) + ")</li>";
                            });
                            document.getElementById('cart-total').innerText = '$' + total.toFixed(2);
                        }

                        async function submitOrder() {
                            if (cart.length === 0) return alert('Cart is empty');
                            const tableId = document.getElementById('table-select').value;

                            const res = await fetch('/api/submit', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ cart, tableId })
                            });

                            if (res.ok) {
                                alert('Order Submitted!');
                                cart = [];
                                renderCart();
                            } else {
                                alert('Failed to submit order');
                            }
                        }

                        loadMenu();
                        loadTables();
                    </script>
                </body>
                </html>
            `);
            return;
        }

        if (req.url === '/api/items' && req.method === 'GET') {
            try {
                const items = await dbManager.getItems();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(items));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        if (req.url === '/api/tables' && req.method === 'GET') {
            try {
                const tables = await dbManager.getTables();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(tables));
            } catch (e) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: e.message }));
            }
            return;
        }

        if (req.url === '/api/submit' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    await dbManager.submitOrder(data.cart, 'Dine-in', null, 'Unpaid', 0, null, 0, data.tableId || null);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (e) {
                    console.error("Waiter app order error:", e);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }

        if (req.url === '/rpc' && req.method === 'POST') {
        // Basic security header check
        if (req.headers['x-rpc-secret'] !== 'local-restaurant-secret') {
            res.writeHead(403);
            return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const { method, args } = data;
                    if (typeof dbManager[method] === 'function') {
                        const result = await dbManager[method](...args);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, result }));
                    } else {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: `Method ${method} not found on server DB` }));
                    }
                } catch (e) {
                    console.error("RPC Error:", e);
                    res.writeHead(500);
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
        res.writeHead(404);
        res.end('Not Found');
    });

    server.listen(8080, '0.0.0.0', () => {
        console.log('RPC Server running on port 8080');
    }).on('error', (err) => {
        console.error('Failed to start RPC Server on port 8080:', err.message);
    });
}
// ---------------------------------------------------

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
  mainWindow.webContents.openDevTools();
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      fs.appendFileSync('renderer_errors.log', `[Renderer Log] Level: ${level} | Line: ${line} | Source: ${sourceId} | Message: ${message}\n`);
  });
  mainWindow.webContents.on('render-process-gone', (event, details) => {
      fs.appendFileSync('renderer_errors.log', `[Renderer Crash] ${JSON.stringify(details)}\n`);
  });

}

const https = require('https');

async function runBackgroundSync() {
    try {
        const settings = await callDb('getSettings', );
        if (!settings || !settings.sync_url) return;

        const unsyncedOrders = await callDb('getUnsyncedOrders', );
        if (unsyncedOrders.length === 0) return;

        const syncUrl = new URL(settings.sync_url);
        const requestModule = syncUrl.protocol === 'https:' ? https : http;

        const postData = JSON.stringify({ orders: unsyncedOrders });

        const options = {
            hostname: syncUrl.hostname,
            port: syncUrl.port || (syncUrl.protocol === 'https:' ? 443 : 80),
            path: syncUrl.pathname || '/sync',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = requestModule.request(options, (res) => {
            if (res.statusCode === 200) {
                const syncedIds = unsyncedOrders.map(o => o.id);
                dbManager.markOrdersSynced(syncedIds);
            }
        });

        req.on('error', (e) => {
            console.error(`Sync problem with request: ${e.message}`);
        });

        req.write(postData);
        req.end();
    } catch (e) {
        console.error("Background sync error:", e);
    }
}

app.whenReady().then(() => {
  // Initialize DB in the main process
  dbManager.initDb(app.getPath('userData'));

  createWindow();
  startRpcServer();

  // Start background sync loop (every 30 seconds)
  setInterval(runBackgroundSync, 30000);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for Renderer to Main communication

ipcMain.handle('db-get-tables', async () => await callDb('getTables'));
ipcMain.handle('db-add-table', async (event, tableNumber) => await callDb('addTable', tableNumber));
ipcMain.handle('db-get-wastage', async () => await callDb('getWastage'));
ipcMain.handle('db-add-wastage', async (event, invId, qty, reason) => await callDb('addWastage', invId, qty, reason));


ipcMain.handle('get-network-config', () => getNetworkConfig());
ipcMain.handle('save-network-config', (event, mode, ip) => {
    saveNetworkConfig(mode, ip);
    return true;
});
ipcMain.handle('db-get-categories', async () => {
    return await callDb('getCategories', );
});

ipcMain.handle('db-get-items', async () => {
    return await callDb('getItems', );
});

ipcMain.handle('db-submit-order', async (event, cart, orderType, customerId, paymentMethod, discount) => {
    return await callDb('submitOrder', cart, orderType, customerId, paymentMethod, discount);
});

ipcMain.handle('db-get-customer', async (event, phone) => {
    return await callDb('getCustomerByPhone', phone);
});

ipcMain.handle('db-get-all-customers', async () => {
    return await callDb('getAllCustomers', );
});

ipcMain.handle('db-get-customer-orders', async (event, customerId) => {
    return await callDb('getCustomerOrders', customerId);
});

ipcMain.handle('db-get-pending-orders', async () => {
    return await callDb('getPendingOrders', );
});

ipcMain.handle('db-get-today-orders', async () => {
    return await callDb('getTodayOrders', );
});

ipcMain.handle('db-mark-order-ready', async (event, orderId) => {
    return await callDb('markOrderReady', orderId);
});

ipcMain.handle('db-refund-order', async (event, orderId) => {
    return await callDb('refundOrder', orderId);
});

ipcMain.handle('db-get-order-items', async (event, orderId) => {
    return await callDb('getOrderItems', orderId);
});

ipcMain.handle('db-refund-order-items', async (event, orderId, itemIdsToRefund) => {
    return await callDb('refundOrderItems', orderId, itemIdsToRefund);
});

ipcMain.handle('db-save-customer', async (event, customer) => {
    return await callDb('saveCustomer', customer);
});

ipcMain.handle('db-get-dashboard-stats', async (event, startDate, endDate) => {
    return await callDb('getDashboardStats', startDate, endDate);
});

const { dialog } = require('electron');
ipcMain.handle('export-csv', async (event, csvContent, filename) => {
    const { filePath } = await dialog.showSaveDialog({
        title: 'Save CSV',
        defaultPath: path.join(app.getPath('documents'), filename),
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });

    if (filePath) {
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return { success: true, path: filePath };
    }
    return { success: false };
});

ipcMain.handle('db-add-expense', async (event, category, amount, description, shiftId) => {
    return await callDb('addExpense', category, amount, description, shiftId);
});
ipcMain.handle('db-get-expenses', async () => {
    return await callDb('getExpenses', );
});
ipcMain.handle('db-add-supplier', async (event, name, contactName, phone, address) => {
    return await callDb('addSupplier', name, contactName, phone, address);
});
ipcMain.handle('db-get-suppliers', async () => {
    return await callDb('getSuppliers', );
});
ipcMain.handle('db-create-po', async (event, supplierId, expectedDate, items) => {
    return await callDb('createPurchaseOrder', supplierId, expectedDate, items);
});
ipcMain.handle('db-get-pos', async () => {
    return await callDb('getPurchaseOrders', );
});
ipcMain.handle('db-receive-po', async (event, poId) => {
    return await callDb('receivePurchaseOrder', poId);
});
ipcMain.handle('db-get-shifts-audit', async () => {
    return await callDb('getShiftsForAudit', );
});
ipcMain.handle('db-audit-shift', async (event, shiftId) => {
    return await callDb('auditShift', shiftId);
});

ipcMain.handle('db-get-inventory', async () => {
    return await callDb('getInventory', );
});

ipcMain.handle('db-add-inventory', async (event, name, unit, stock, threshold) => {
    return await callDb('addInventoryItem', name, unit, stock, threshold);
});

ipcMain.handle('db-add-menu-item', async (event, catId, name, price, img) => {
    return await callDb('addMenuItem', catId, name, price, img);
});

ipcMain.handle('db-add-recipe', async (event, itemId, invId, qty) => {
    return await callDb('addRecipe', itemId, invId, qty);
});

ipcMain.handle('db-delete-inventory', async (event, id) => {
    return await callDb('deleteInventoryItem', id);
});

ipcMain.handle('db-delete-menu-item', async (event, id) => {
    return await callDb('deleteMenuItem', id);
});

ipcMain.handle('db-update-inventory', async (event, id, name, unit, stock, threshold) => {
    return await callDb('updateInventoryItem', id, name, unit, stock, threshold);
});

ipcMain.handle('db-update-menu-item', async (event, id, catId, name, price, img) => {
    return await callDb('updateMenuItem', id, catId, name, price, img);
});

ipcMain.handle('db-get-settings', async () => {
    return await callDb('getSettings', );
});

ipcMain.handle('db-save-settings', async (event, storeName, taxNumber, syncUrl) => {
    return await callDb('saveSettings', storeName, taxNumber, syncUrl);
});

ipcMain.handle('db-login-user', async (event, username, password) => {
    return await callDb('loginUser', username, password);
});

ipcMain.handle('db-get-users', async () => {
    return await callDb('getUsers', );
});

ipcMain.handle('db-add-user', async (event, name, username, password, role) => {
    return await callDb('addUser', name, username, password, role);
});

ipcMain.handle('db-delete-user', async (event, id) => {
    return await callDb('deleteUser', id);
});

ipcMain.handle('db-get-drivers', async () => {
    return await callDb('getDrivers', );
});

ipcMain.handle('db-add-driver', async (event, name, phone) => {
    return await callDb('addDriver', name, phone);
});

ipcMain.handle('db-delete-driver', async (event, id) => {
    return await callDb('deleteDriver', id);
});

ipcMain.handle('db-get-unassigned-deliveries', async () => {
    return await callDb('getUnassignedDeliveries', );
});

ipcMain.handle('db-assign-driver', async (event, orderId, driverId) => {
    return await callDb('assignDriver', orderId, driverId);
});

ipcMain.handle('db-get-driver-settlements', async () => {
    return await callDb('getDriverSettlements', );
});

ipcMain.handle('db-settle-driver', async (event, driverId) => {
    return await callDb('settleDriver', driverId);
});

ipcMain.handle('db-open-shift', async (event, name, cash) => {
    return await callDb('openShift', name, cash);
});

ipcMain.handle('db-get-shift', async () => {
    return await callDb('getCurrentShift', );
});

ipcMain.handle('db-close-shift', async (event, actualCash, shiftId) => {
    return await callDb('closeShift', actualCash, shiftId);
});

ipcMain.handle('db-get-z-report', async (event, shiftId) => {
    return await callDb('getZReport', shiftId);
});

ipcMain.handle('check-license', async () => {
    return await callDb('checkLicense', );
});

ipcMain.handle('activate-license', async (event, key) => {
    return await callDb('activateLicense', key);
});

ipcMain.handle('db-verify-master-password', async (event, password) => {
    return await callDb('verifyMasterPassword', password);
});

ipcMain.handle('db-generate-license', async (event, days, targetMachineId) => {
    return await callDb('generateLicenseToken', days, targetMachineId);
});

// Helper to easily grab the machine ID for the front end generator
ipcMain.handle('get-machine-id', async () => {
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
});
