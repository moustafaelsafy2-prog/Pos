const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let db;

// Pre-computed hash for 'admin12345'
const MASTER_PASSWORD_HASH = "$2b$08$pPJu872WBb8a/TJA8iW8LO7n8AWVnQpDmRNa1VRWnmxkE1din41h2";

function initDb(userDataPath) {
    const dbPath = path.join(userDataPath, 'pos_database.sqlite');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database', err.message);
        } else {
            console.log('Connected to the SQLite database at:', dbPath);
            setupSchema();
        }
    });
}

function setupSchema() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)`);
        db.run(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER, name TEXT NOT NULL, price REAL NOT NULL, image_url TEXT, FOREIGN KEY (category_id) REFERENCES categories (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE, address TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS drivers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_name TEXT NOT NULL, start_time DATETIME DEFAULT CURRENT_TIMESTAMP, end_time DATETIME, starting_cash REAL DEFAULT 0, expected_cash REAL DEFAULT 0, actual_cash REAL DEFAULT 0, status TEXT DEFAULT 'open', is_audited INTEGER DEFAULT 0)`);

        db.run(`ALTER TABLE shifts ADD COLUMN is_audited INTEGER DEFAULT 0`, (err) => {
            // Ignore if exists
        });
        db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, shift_id INTEGER, customer_id INTEGER, driver_id INTEGER, order_type TEXT DEFAULT 'Dine-in', subtotal REAL DEFAULT 0, tax_amount REAL DEFAULT 0, discount REAL DEFAULT 0, total_amount REAL NOT NULL, payment_method TEXT DEFAULT 'Cash', order_date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'preparing', is_settled INTEGER DEFAULT 0, is_synced INTEGER DEFAULT 0, FOREIGN KEY (customer_id) REFERENCES customers (id), FOREIGN KEY (shift_id) REFERENCES shifts (id), FOREIGN KEY (driver_id) REFERENCES drivers (id))`);

        db.run(`ALTER TABLE orders ADD COLUMN is_synced INTEGER DEFAULT 0`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_id INTEGER, quantity INTEGER NOT NULL, subtotal REAL NOT NULL, notes TEXT, status TEXT, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (item_id) REFERENCES items (id))`);

        db.run(`ALTER TABLE order_items ADD COLUMN status TEXT`, (err) => {
            // Ignore if exists
        });
        db.run(`CREATE TABLE IF NOT EXISTS license (id INTEGER PRIMARY KEY AUTOINCREMENT, serial_key TEXT, activated_at DATETIME, expires_at DATETIME, machine_id TEXT)`);

        // Inventory and Recipes
        db.run(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, unit TEXT NOT NULL, current_stock REAL DEFAULT 0, low_stock_threshold REAL DEFAULT 10)`);
        db.run(`CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, inventory_id INTEGER, quantity_required REAL NOT NULL, FOREIGN KEY (item_id) REFERENCES items (id), FOREIGN KEY (inventory_id) REFERENCES inventory (id))`);

        // Accounting
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact_name TEXT, phone TEXT, address TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, order_date DATETIME DEFAULT CURRENT_TIMESTAMP, expected_date DATETIME, status TEXT DEFAULT 'pending', total_amount REAL DEFAULT 0, FOREIGN KEY (supplier_id) REFERENCES suppliers (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER, inventory_id INTEGER, quantity REAL NOT NULL, unit_cost REAL NOT NULL, subtotal REAL NOT NULL, FOREIGN KEY (po_id) REFERENCES purchase_orders (id), FOREIGN KEY (inventory_id) REFERENCES inventory (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, amount REAL NOT NULL, description TEXT, expense_date DATETIME DEFAULT CURRENT_TIMESTAMP, shift_id INTEGER, FOREIGN KEY (shift_id) REFERENCES shifts (id))`);

        // Settings & Users
        db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, store_name TEXT, tax_number TEXT, sync_url TEXT)`);

        // Add sync_url to existing settings table if it doesn't exist
        db.run(`ALTER TABLE settings ADD COLUMN sync_url TEXT`, (err) => {
            // Ignore error if column already exists
        });

        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, pin TEXT UNIQUE NOT NULL, role TEXT DEFAULT 'cashier')`);

        // Seed initial data if empty
        db.get('SELECT COUNT(*) AS count FROM categories', [], (err, row) => {
            if (!err && row.count === 0) {
                db.run(`INSERT INTO categories (name) VALUES ('Main Course'), ('Drinks'), ('Desserts')`);
                db.run(`INSERT INTO items (category_id, name, price, image_url) VALUES
                    (1, 'Classic Burger', 8.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80'),
                    (1, 'Pepperoni Pizza', 12.99, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&q=80'),
                    (2, 'Coca Cola', 2.99, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80'),
                    (2, 'Fresh Water', 1.99, 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=500&q=80'),
                    (3, 'Vanilla Ice Cream', 4.99, 'https://images.unsplash.com/photo-1570197781417-0a5237575199?w=500&q=80')`);

                // Seed Inventory
                db.run(`INSERT INTO inventory (name, unit, current_stock, low_stock_threshold) VALUES
                    ('Ground Beef', 'kg', 50.0, 10.0),
                    ('Burger Buns', 'pcs', 200, 50),
                    ('Cheese Slices', 'pcs', 300, 50),
                    ('Pizza Dough', 'pcs', 100, 20),
                    ('Pepperoni', 'kg', 20.0, 5.0)`);

                // Seed Recipes (Map inventory to items)
                // Classic Burger (id: 1) = 0.15kg Beef + 1 Bun + 1 Cheese
                db.run(`INSERT INTO recipes (item_id, inventory_id, quantity_required) VALUES
                    (1, 1, 0.15),
                    (1, 2, 1.0),
                    (1, 3, 1.0)`);

                // Pepperoni Pizza (id: 2) = 1 Dough + 0.1kg Pepperoni + 2 Cheese (simulated)
                db.run(`INSERT INTO recipes (item_id, inventory_id, quantity_required) VALUES
                    (2, 4, 1.0),
                    (2, 5, 0.1),
                    (2, 3, 2.0)`);
            }
        });

        // Seed Settings
        db.get('SELECT COUNT(*) AS count FROM settings', [], (err, row) => {
            if (!err && row.count === 0) {
                db.run(`INSERT INTO settings (store_name, tax_number) VALUES ('My Restaurant', '1234567890')`);
            }
        });

        // Seed Default Admin
        db.get('SELECT COUNT(*) AS count FROM users', [], (err, row) => {
            if (!err && row.count === 0) {
                const hashedPin = bcrypt.hashSync('0000', 8);
                db.run(`INSERT INTO users (name, pin, role) VALUES ('Admin', ?, 'admin')`, [hashedPin]);
            }
        });
    });
}

function getDrivers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT d.*,
                   COUNT(o.id) as pending_deliveries
            FROM drivers d
            LEFT JOIN orders o ON o.driver_id = d.id AND o.status IN ('preparing', 'ready')
            GROUP BY d.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addDriver(name, phone) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO drivers (name, phone) VALUES (?, ?)`, [name, phone], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function deleteDriver(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM drivers WHERE id = ?`, [id], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function getUnassignedDeliveries() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT o.*, c.name as customer_name, c.address
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE o.order_type = 'Delivery' AND o.driver_id IS NULL AND o.status != 'refunded'
                ORDER BY o.id ASC`, [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function assignDriver(orderId, driverId) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE orders SET driver_id = ? WHERE id = ?`, [driverId, orderId], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function getDriverSettlements() {
    return new Promise((resolve, reject) => {
        // Get total unsettled cash per driver
        const query = `
            SELECT d.id, d.name, d.phone, SUM(o.total_amount) as total_cash_due, COUNT(o.id) as orders_count
            FROM drivers d
            JOIN orders o ON o.driver_id = d.id
            WHERE o.is_settled = 0 AND o.payment_method = 'Cash' AND o.status != 'refunded'
            GROUP BY d.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function settleDriver(driverId) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE orders SET is_settled = 1 WHERE driver_id = ? AND is_settled = 0 AND payment_method = 'Cash'`, [driverId], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function getTodayOrders() {
    return new Promise((resolve, reject) => {
        // SQLite 'now' returns UTC, using DATE('now', 'localtime') ensures it matches local day
        db.all(`SELECT o.*, c.name as customer_name
                FROM orders o
                LEFT JOIN customers c ON o.customer_id = c.id
                WHERE DATE(o.order_date) = DATE('now', 'localtime')
                ORDER BY o.id DESC`, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getOrderItems(orderId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT oi.*, i.name
            FROM order_items oi
            JOIN items i ON oi.item_id = i.id
            WHERE oi.order_id = ? AND (oi.status != 'refunded' OR oi.status IS NULL)
        `, [orderId], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function refundOrderItems(orderId, itemIdsToRefund) {
    return new Promise((resolve, reject) => {
        if (!itemIdsToRefund || itemIdsToRefund.length === 0) return resolve(false);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Mark specific items as refunded
            const placeholders = itemIdsToRefund.map(() => '?').join(',');
            db.run(`UPDATE order_items SET status = 'refunded' WHERE id IN (${placeholders})`, itemIdsToRefund, function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                }

                // Fetch those specific items to restore inventory and calculate refund amount
                db.all(`SELECT item_id, quantity, subtotal FROM order_items WHERE id IN (${placeholders})`, itemIdsToRefund, (err, items) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    let refundAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

                    // Update order totals
                    db.run(`UPDATE orders SET subtotal = subtotal - ?, total_amount = total_amount - ? WHERE id = ?`,
                    [refundAmount, refundAmount * 1.15, orderId], (err) => {
                        if (err) {
                            db.run("ROLLBACK");
                            return reject(err);
                        }

                        // Restore inventory
                        const restorePromises = items.map(orderItem => {
                            return new Promise((res, rej) => {
                                db.all("SELECT inventory_id, quantity_required FROM recipes WHERE item_id = ?", [orderItem.item_id], (err, recipeItems) => {
                                    if (err) return rej(err);
                                    if (!recipeItems || recipeItems.length === 0) return res();

                                    const stockUpdates = recipeItems.map(ri => {
                                        return new Promise((stockRes, stockRej) => {
                                            const qtyToRestore = ri.quantity_required * orderItem.quantity;
                                            db.run("UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?", [qtyToRestore, ri.inventory_id], (err) => {
                                                if (err) stockRej(err); else stockRes();
                                            });
                                        });
                                    });

                                    Promise.all(stockUpdates).then(res).catch(rej);
                                });
                            });
                        });

                        Promise.all(restorePromises)
                            .then(() => {
                                db.run("COMMIT");
                                resolve(true);
                            })
                            .catch(err => {
                                db.run("ROLLBACK");
                                reject(err);
                            });
                    });
                });
            });
        });
    });
}

function refundOrder(orderId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // 1. Mark order as refunded
            db.run("UPDATE orders SET status = 'refunded' WHERE id = ? AND status != 'refunded'", [orderId], function(err) {
                if (err || this.changes === 0) {
                    db.run("ROLLBACK");
                    return reject(err || new Error("Order not found or already refunded"));
                }

                // 2. Fetch all items in this order
                db.all("SELECT item_id, quantity FROM order_items WHERE order_id = ?", [orderId], (err, orderItems) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    if (!orderItems || orderItems.length === 0) {
                        db.run("COMMIT");
                        return resolve(true);
                    }

                    // 3. For each order item, find its recipe and restore inventory
                    const restorePromises = orderItems.map(orderItem => {
                        return new Promise((res, rej) => {
                            db.all("SELECT inventory_id, quantity_required FROM recipes WHERE item_id = ?", [orderItem.item_id], (err, recipeItems) => {
                                if (err) return rej(err);
                                if (!recipeItems || recipeItems.length === 0) return res();

                                const stockUpdates = recipeItems.map(ri => {
                                    return new Promise((stockRes, stockRej) => {
                                        const qtyToRestore = ri.quantity_required * orderItem.quantity;
                                        db.run("UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?", [qtyToRestore, ri.inventory_id], (err) => {
                                            if (err) stockRej(err); else stockRes();
                                        });
                                    });
                                });

                                Promise.all(stockUpdates).then(res).catch(rej);
                            });
                        });
                    });

                    Promise.all(restorePromises)
                        .then(() => {
                            db.run("COMMIT");
                            resolve(true);
                        })
                        .catch(err => {
                            db.run("ROLLBACK");
                            reject(err);
                        });
                });
            });
        });
    });
}

function getPendingOrders() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM orders WHERE status = 'preparing' ORDER BY order_date ASC", [], async (err, orders) => {
            if (err) return reject(err);
            if (!orders || orders.length === 0) return resolve([]);

            try {
                // Fetch items for each order
                const ordersWithItems = await Promise.all(orders.map(order => {
                    return new Promise((res, rej) => {
                        const query = `
                            SELECT oi.quantity, oi.notes, i.name
                            FROM order_items oi
                            JOIN items i ON oi.item_id = i.id
                            WHERE oi.order_id = ?
                        `;
                        db.all(query, [order.id], (err, items) => {
                            if (err) rej(err);
                            else res({ ...order, items });
                        });
                    });
                }));
                resolve(ordersWithItems);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function markOrderReady(orderId) {
    return new Promise((resolve, reject) => {
        db.run("UPDATE orders SET status = 'completed' WHERE id = ?", [orderId], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function getCustomerOrders(customerId) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC", [customerId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getAllCustomers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM customers ORDER BY name ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM settings ORDER BY id DESC LIMIT 1", [], (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

function saveSettings(storeName, taxNumber, syncUrl) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM settings ORDER BY id DESC LIMIT 1", [], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run(`UPDATE settings SET store_name = ?, tax_number = ?, sync_url = ? WHERE id = ?`, [storeName, taxNumber, syncUrl, row.id], err => {
                    if (err) reject(err); else resolve(true);
                });
            } else {
                db.run(`INSERT INTO settings (store_name, tax_number, sync_url) VALUES (?, ?, ?)`, [storeName, taxNumber, syncUrl], err => {
                    if (err) reject(err); else resolve(true);
                });
            }
        });
    });
}

function loginUser(pin) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM users", [], (err, rows) => {
            if (err) return reject(err);

            // Compare entered pin against all hashed pins
            const user = rows.find(row => bcrypt.compareSync(pin, row.pin));
            resolve(user || null);
        });
    });
}

function getUsers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id, name, role FROM users", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addUser(name, pin, role) {
    return new Promise((resolve, reject) => {
        const hashedPin = bcrypt.hashSync(pin, 8);
        db.run(`INSERT INTO users (name, pin, role) VALUES (?, ?, ?)`, [name, hashedPin, role], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function verifyMasterPassword(password) {
    return new Promise((resolve) => {
        resolve(bcrypt.compareSync(password, MASTER_PASSWORD_HASH));
    });
}

function generateLicenseToken(days) {
    return new Promise((resolve, reject) => {
        try {
            const machineId = machineIdSync();
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + parseInt(days));

            const payload = {
                machineId: machineId,
                expiresAt: expirationDate.toISOString()
            };

            const privateKeyPath = path.join(__dirname, '..', '..', '..', 'tools', 'private.pem');
            if (!fs.existsSync(privateKeyPath)) {
                return reject(new Error('Private key not found. Ensure tools/private.pem exists for development generation.'));
            }
            const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

            const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
            resolve(token);
        } catch (e) {
            reject(e);
        }
    });
}

function deleteUser(id) {
    return new Promise((resolve, reject) => {
        db.run(`DELETE FROM users WHERE id = ?`, [id], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function getCategories() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM categories", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getItems() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM items", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addInventoryItem(name, unit, stock, threshold) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO inventory (name, unit, current_stock, low_stock_threshold) VALUES (?, ?, ?, ?)`,
        [name, unit, stock, threshold], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function addMenuItem(categoryId, name, price, imageUrl) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO items (category_id, name, price, image_url) VALUES (?, ?, ?, ?)`,
        [categoryId, name, price, imageUrl || null], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function addRecipe(itemId, inventoryId, qty) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO recipes (item_id, inventory_id, quantity_required) VALUES (?, ?, ?)`,
        [itemId, inventoryId, qty], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function updateInventoryItem(id, name, unit, stock, threshold) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE inventory SET name = ?, unit = ?, current_stock = ?, low_stock_threshold = ? WHERE id = ?`,
        [name, unit, stock, threshold, id], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function updateMenuItem(id, categoryId, name, price, imageUrl) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE items SET category_id = ?, name = ?, price = ?, image_url = ? WHERE id = ?`,
        [categoryId, name, price, imageUrl || null, id], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

function deleteInventoryItem(id) {
    return new Promise((resolve, reject) => {
        // Also delete associated recipes
        db.run(`DELETE FROM recipes WHERE inventory_id = ?`, [id], (err) => {
            if (err) return reject(err);
            db.run(`DELETE FROM inventory WHERE id = ?`, [id], function(err) {
                if (err) reject(err); else resolve(this.changes);
            });
        });
    });
}

function deleteMenuItem(id) {
    return new Promise((resolve, reject) => {
        // Also delete associated recipes
        db.run(`DELETE FROM recipes WHERE item_id = ?`, [id], (err) => {
            if (err) return reject(err);
            db.run(`DELETE FROM items WHERE id = ?`, [id], function(err) {
                if (err) reject(err); else resolve(this.changes);
            });
        });
    });
}

function getInventory() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM inventory", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function openShift(cashierName, startingCash) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO shifts (cashier_name, starting_cash, status) VALUES (?, ?, 'open')`,
        [cashierName, startingCash], function(err) {
            if (err) reject(err); else resolve({ id: this.lastID, cashier_name: cashierName, starting_cash: startingCash });
        });
    });
}

function getCurrentShift() {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1`, [], (err, row) => {
            if (err) reject(err); else resolve(row || null);
        });
    });
}

function closeShift(actualCash, shiftId) {
    return new Promise((resolve, reject) => {
        // Calculate expected cash: starting_cash + sum of Cash orders for this shift
        db.get(`
            SELECT s.starting_cash,
                   COALESCE((SELECT SUM(total_amount) FROM orders WHERE shift_id = s.id AND payment_method = 'Cash'), 0) as cash_sales
            FROM shifts s WHERE s.id = ?
        `, [shiftId], (err, row) => {
            if (err) return reject(err);
            if (!row) return reject(new Error("Shift not found"));

            const expectedCash = row.starting_cash + row.cash_sales;

            db.run(`UPDATE shifts SET end_time = CURRENT_TIMESTAMP, expected_cash = ?, actual_cash = ?, status = 'closed' WHERE id = ?`,
            [expectedCash, actualCash, shiftId], function(err) {
                if (err) reject(err); else resolve({ expected_cash: expectedCash, actual_cash: actualCash });
            });
        });
    });
}

// --- ACCOUNTING & PURCHASING FUNCTIONS ---

function addExpense(category, amount, description, shiftId) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO expenses (category, amount, description, shift_id) VALUES (?, ?, ?, ?)`,
        [category, amount, description, shiftId || null], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function getExpenses() {
    return new Promise((resolve, reject) => {
        db.all("SELECT e.*, s.cashier_name FROM expenses e LEFT JOIN shifts s ON e.shift_id = s.id ORDER BY e.expense_date DESC", [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function addSupplier(name, contactName, phone, address) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO suppliers (name, contact_name, phone, address) VALUES (?, ?, ?, ?)`,
        [name, contactName, phone, address], function(err) {
            if (err) reject(err); else resolve(this.lastID);
        });
    });
}

function getSuppliers() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM suppliers ORDER BY name ASC", [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function createPurchaseOrder(supplierId, expectedDate, items) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

            db.run(`INSERT INTO purchase_orders (supplier_id, expected_date, total_amount) VALUES (?, ?, ?)`,
            [supplierId, expectedDate, totalAmount], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    return reject(err);
                }
                const poId = this.lastID;
                const stmt = db.prepare(`INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_cost, subtotal) VALUES (?, ?, ?, ?, ?)`);

                items.forEach(item => {
                    stmt.run(poId, item.inventory_id, item.quantity, item.unit_cost, item.quantity * item.unit_cost);
                });
                stmt.finalize();

                db.run("COMMIT", (err) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }
                    resolve(poId);
                });
            });
        });
    });
}

function getPurchaseOrders() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT po.*, s.name as supplier_name FROM purchase_orders po JOIN suppliers s ON po.supplier_id = s.id ORDER BY po.order_date DESC`, [], async (err, pos) => {
            if (err) return reject(err);
            if (!pos || pos.length === 0) return resolve([]);

            try {
                const posWithItems = await Promise.all(pos.map(po => {
                    return new Promise((res, rej) => {
                        db.all(`SELECT poi.*, i.name, i.unit FROM purchase_order_items poi JOIN inventory i ON poi.inventory_id = i.id WHERE poi.po_id = ?`, [po.id], (err, items) => {
                            if (err) return rej(err);
                            po.items = items;
                            res(po);
                        });
                    });
                }));
                resolve(posWithItems);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function receivePurchaseOrder(poId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            db.run(`UPDATE purchase_orders SET status = 'received' WHERE id = ? AND status = 'pending'`, [poId], function(err) {
                if (err || this.changes === 0) {
                    db.run("ROLLBACK");
                    return reject(err || new Error("PO not found or already received"));
                }

                db.all(`SELECT inventory_id, quantity FROM purchase_order_items WHERE po_id = ?`, [poId], (err, items) => {
                    if (err) {
                        db.run("ROLLBACK");
                        return reject(err);
                    }

                    const updatePromises = items.map(item => {
                        return new Promise((res, rej) => {
                            db.run(`UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?`, [item.quantity, item.inventory_id], (err) => {
                                if (err) rej(err); else res();
                            });
                        });
                    });

                    Promise.all(updatePromises)
                        .then(() => {
                            db.run("COMMIT");
                            resolve(true);
                        })
                        .catch(err => {
                            db.run("ROLLBACK");
                            reject(err);
                        });
                });
            });
        });
    });
}

function getShiftsForAudit() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM shifts ORDER BY start_time DESC LIMIT 50", [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function auditShift(shiftId) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE shifts SET is_audited = 1 WHERE id = ?`, [shiftId], function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

// ----------------------------------------

function getZReport(shiftId) {
    return new Promise((resolve, reject) => {
        const report = {};
        db.get(`SELECT * FROM shifts WHERE id = ?`, [shiftId], (err, shift) => {
            if (err || !shift) return reject(err || new Error("Shift not found"));
            report.shift = shift;

            db.all(`SELECT payment_method, COUNT(id) as count, SUM(total_amount) as total FROM orders WHERE shift_id = ? AND status != 'refunded' GROUP BY payment_method`, [shiftId], (err, rows) => {
                if (err) return reject(err);
                report.sales = rows;

                db.all(`SELECT COUNT(id) as count, SUM(total_amount) as total FROM orders WHERE shift_id = ? AND status = 'refunded'`, [shiftId], (err, refundRows) => {
                    if (err) return reject(err);
                    report.refunds = refundRows[0] || { count: 0, total: 0 };
                    resolve(report);
                });
            });
        });
    });
}

function getDashboardStats(startDate = null, endDate = null) {
    return new Promise((resolve, reject) => {
        const stats = {};

        let dateFilterOrders = "";
        let dateFilterOrderItems = "";
        const queryParams = [];

        if (startDate && endDate) {
            // Append time so end date includes the whole day
            const start = startDate + " 00:00:00";
            const end = endDate + " 23:59:59";

            dateFilterOrders = " WHERE order_date >= ? AND order_date <= ? ";
            // Need a separate logic for order_items since order_date is on orders table
            dateFilterOrderItems = " JOIN orders o ON oi.order_id = o.id WHERE o.order_date >= ? AND o.order_date <= ? ";
            queryParams.push(start, end);
        } else {
            // Fallback for order_items query if no date filter is applied to keep joins consistent
            dateFilterOrderItems = " JOIN orders o ON oi.order_id = o.id ";
        }

        Promise.all([
            // 1. Total Revenue & Order Count
            new Promise((res, rej) => {
                db.get(`SELECT COUNT(id) as totalOrders, SUM(total_amount) as totalRevenue, SUM(tax_amount) as totalTax FROM orders ${dateFilterOrders}`, queryParams, (err, row) => {
                    if (err) rej(err); else res(row);
                });
            }),
            // 2. Sales by Order Type
            new Promise((res, rej) => {
                db.all(`SELECT order_type, COUNT(id) as count FROM orders ${dateFilterOrders} GROUP BY order_type`, queryParams, (err, rows) => {
                    if (err) rej(err); else res(rows);
                });
            }),
            // 3. Sales by Payment Method
            new Promise((res, rej) => {
                db.all(`SELECT payment_method, SUM(total_amount) as total FROM orders ${dateFilterOrders} GROUP BY payment_method`, queryParams, (err, rows) => {
                    if (err) rej(err); else res(rows);
                });
            }),
            // 4. Top Selling Items
            new Promise((res, rej) => {
                const query = `
                    SELECT i.name, SUM(oi.quantity) as total_sold
                    FROM order_items oi
                    JOIN items i ON oi.item_id = i.id
                    ${dateFilterOrderItems}
                    GROUP BY oi.item_id
                    ORDER BY total_sold DESC
                    LIMIT 5
                `;
                db.all(query, startDate && endDate ? queryParams : [], (err, rows) => {
                    if (err) rej(err); else res(rows);
                });
            })
        ]).then(results => {
            stats.overview = results[0];
            stats.byType = results[1];
            stats.byPayment = results[2];
            stats.topItems = results[3];
            resolve(stats);
        }).catch(err => reject(err));
    });
}

function submitOrder(cart, orderType, customerId, paymentMethod, discount, shiftId, pointsRedeemed = 0) {
    return new Promise((resolve, reject) => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const taxRate = 0.15; // 15% VAT
        const taxAmount = (subtotal - discount) * taxRate;
        const total = subtotal - discount + taxAmount;

        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            db.run(`INSERT INTO orders (shift_id, subtotal, tax_amount, discount, total_amount, order_type, customer_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [shiftId || null, subtotal, taxAmount, discount, total, orderType || 'Dine-in', customerId || null, paymentMethod || 'Cash'], function(err) {
                if (err) {
                    return db.run('ROLLBACK', () => reject(err));
                }
                const orderId = this.lastID;

                const stmt = db.prepare(`INSERT INTO order_items (order_id, item_id, quantity, subtotal, notes) VALUES (?, ?, ?, ?, ?)`);

                // 1. Insert all order items
                cart.forEach(item => {
                    stmt.run(orderId, item.id, item.qty, item.price * item.qty, item.notes || null);
                });
                stmt.finalize();

                // 2. Auto-deduct inventory based on recipes using Promises to handle async flow
                const deductionPromises = cart.map(item => {
                    return new Promise((res, rej) => {
                        db.all(`SELECT inventory_id, quantity_required FROM recipes WHERE item_id = ?`, [item.id], (err, ingredients) => {
                            if (err) return rej(err);
                            if (!ingredients || ingredients.length === 0) return res(); // No recipe found

                            // Deduct all ingredients for this item
                            const updatePromises = ingredients.map(ing => {
                                return new Promise((innerRes, innerRej) => {
                                    const totalDeduction = ing.quantity_required * item.qty;
                                    db.run(`UPDATE inventory SET current_stock = current_stock - ? WHERE id = ?`, [totalDeduction, ing.inventory_id], (err) => {
                                        if (err) innerRej(err); else innerRes();
                                    });
                                });
                            });

                            Promise.all(updatePromises).then(res).catch(rej);
                        });
                    });
                });

                // Wait for all inventory deductions to complete
                Promise.all(deductionPromises)
                    .then(() => {
                        // 3. Update customer points if customerId is provided
                        if (customerId) {
                            const pointsEarned = Math.floor(total);
                            db.run(`UPDATE customers SET points = points + ? - ? WHERE id = ?`, [pointsEarned, pointsRedeemed, customerId], (err) => {
                                if (err) return db.run('ROLLBACK', () => reject(err));
                                db.run('COMMIT', (err) => {
                                    if (err) return db.run('ROLLBACK', () => reject(err));
                                    resolve({ orderId, total, subtotal, taxAmount, discount, pointsEarned });
                                });
                            });
                        } else {
                            db.run('COMMIT', (err) => {
                                if (err) return db.run('ROLLBACK', () => reject(err));
                                resolve({ orderId, total, subtotal, taxAmount, discount });
                            });
                        }
                    })
                    .catch(err => {
                        db.run('ROLLBACK', () => reject(err));
                    });
            });
        });
    });
}

function getCustomerByPhone(phone) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM customers WHERE phone = ?", [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function saveCustomer(customer) {
    return new Promise((resolve, reject) => {
        if (customer.id) {
            db.run(`UPDATE customers SET name = ?, address = ? WHERE id = ?`,
                [customer.name, customer.address, customer.id], function(err) {
                if (err) reject(err);
                else resolve(customer.id);
            });
        } else {
            db.run(`INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
                [customer.name, customer.phone, customer.address], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        }
    });
}

function checkLicense() {
    return new Promise((resolve, reject) => {
        const currentMachineId = machineIdSync();
        db.get(`SELECT * FROM license WHERE machine_id = ? ORDER BY id DESC LIMIT 1`, [currentMachineId], (err, row) => {
            if (err) return reject(err);

            if (!row) return resolve({ valid: false });

            try {
                const publicKeyPath = path.join(__dirname, '..', 'public.pem');
                const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
                // Verify the JWT stored in the database
                const decoded = jwt.verify(row.serial_key, publicKey, { algorithms: ['RS256'] });

                // Ensure the token was generated for THIS specific machine
                if (decoded.machineId !== currentMachineId) {
                    return resolve({ valid: false });
                }

                // Check expiration
                if (new Date(decoded.expiresAt) > new Date()) {
                    resolve({ valid: true });
                } else {
                    resolve({ valid: false });
                }
            } catch (error) {
                // Token is invalid, tampered with, or expired
                resolve({ valid: false });
            }
        });
    });
}

function activateLicense(token) {
    return new Promise((resolve, reject) => {
        try {
            const currentMachineId = machineIdSync();
            const publicKeyPath = path.join(__dirname, '..', 'public.pem');
            const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

            if (decoded.machineId !== currentMachineId) {
                return resolve({ success: false, message: "License key is not valid for this machine." });
            }

            if (new Date(decoded.expiresAt) <= new Date()) {
                return resolve({ success: false, message: "License key has already expired." });
            }

            const now = new Date();

            db.run(`INSERT INTO license (serial_key, activated_at, expires_at, machine_id) VALUES (?, ?, ?, ?)`,
            [token, now.toISOString(), decoded.expiresAt, currentMachineId], function(err) {
                if (err) return reject(err);
                resolve({ success: true, message: "Activation Successful!" });
            });
        } catch (error) {
            resolve({ success: false, message: "Invalid or Corrupted Serial Key." });
        }
    });
}

function getUnsyncedOrders() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM orders WHERE is_synced = 0 AND status IN ('completed', 'refunded')", [], async (err, orders) => {
            if (err) return reject(err);
            if (!orders || orders.length === 0) return resolve([]);

            try {
                const ordersWithItems = await Promise.all(orders.map(order => {
                    return new Promise((res, rej) => {
                        db.all("SELECT * FROM order_items WHERE order_id = ?", [order.id], (err, items) => {
                            if (err) return rej(err);
                            order.items = items;
                            res(order);
                        });
                    });
                }));
                resolve(ordersWithItems);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function markOrdersSynced(orderIds) {
    return new Promise((resolve, reject) => {
        if (!orderIds || orderIds.length === 0) return resolve(true);
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(`UPDATE orders SET is_synced = 1 WHERE id IN (${placeholders})`, orderIds, function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}

module.exports = {
    initDb,
    addExpense,
    getExpenses,
    addSupplier,
    getSuppliers,
    createPurchaseOrder,
    getPurchaseOrders,
    receivePurchaseOrder,
    getShiftsForAudit,
    auditShift,
    getCategories,
    getItems,
    getUnsyncedOrders,
    markOrdersSynced,
    submitOrder,
    checkLicense,
    activateLicense,
    getCustomerByPhone,
    getAllCustomers,
    getCustomerOrders,
    getPendingOrders,
    getTodayOrders,
    markOrderReady,
    refundOrder,
    saveCustomer,
    getDashboardStats,
    getInventory,
    addInventoryItem,
    addMenuItem,
    addRecipe,
    deleteInventoryItem,
    deleteMenuItem,
    updateInventoryItem,
    updateMenuItem,
    getSettings,
    saveSettings,
    loginUser,
    getUsers,
    addUser,
    deleteUser,
    getDrivers,
    addDriver,
    deleteDriver,
    getUnassignedDeliveries,
    assignDriver,
    getDriverSettlements,
    settleDriver,
    openShift,
    getCurrentShift,
    closeShift,
    getZReport,
    verifyMasterPassword,
    generateLicenseToken
};
