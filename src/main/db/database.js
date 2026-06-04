const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { machineIdSync } = require('node-machine-id');

let db;

const VALID_KEY = "1234-ABCD-5678-EFGH"; // Mock valid key for demo

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
        db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, order_type TEXT DEFAULT 'Dine-in', subtotal REAL DEFAULT 0, tax_amount REAL DEFAULT 0, discount REAL DEFAULT 0, total_amount REAL NOT NULL, payment_method TEXT DEFAULT 'Cash', order_date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'completed', FOREIGN KEY (customer_id) REFERENCES customers (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_id INTEGER, quantity INTEGER NOT NULL, subtotal REAL NOT NULL, notes TEXT, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (item_id) REFERENCES items (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS license (id INTEGER PRIMARY KEY AUTOINCREMENT, serial_key TEXT, activated_at DATETIME, expires_at DATETIME, machine_id TEXT)`);

        // Inventory and Recipes
        db.run(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, unit TEXT NOT NULL, current_stock REAL DEFAULT 0, low_stock_threshold REAL DEFAULT 10)`);
        db.run(`CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, inventory_id INTEGER, quantity_required REAL NOT NULL, FOREIGN KEY (item_id) REFERENCES items (id), FOREIGN KEY (inventory_id) REFERENCES inventory (id))`);

        // Settings
        db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, store_name TEXT, tax_number TEXT)`);

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
    });
}

function getSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM settings ORDER BY id DESC LIMIT 1", [], (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
}

function saveSettings(storeName, taxNumber) {
    return new Promise((resolve, reject) => {
        db.get("SELECT id FROM settings ORDER BY id DESC LIMIT 1", [], (err, row) => {
            if (err) return reject(err);
            if (row) {
                db.run(`UPDATE settings SET store_name = ?, tax_number = ? WHERE id = ?`, [storeName, taxNumber, row.id], err => {
                    if (err) reject(err); else resolve(true);
                });
            } else {
                db.run(`INSERT INTO settings (store_name, tax_number) VALUES (?, ?)`, [storeName, taxNumber], err => {
                    if (err) reject(err); else resolve(true);
                });
            }
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

function getInventory() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM inventory", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getDashboardStats() {
    return new Promise((resolve, reject) => {
        const stats = {};

        // Use Promise.all to run all stats queries in parallel
        Promise.all([
            // 1. Total Revenue & Order Count
            new Promise((res, rej) => {
                db.get("SELECT COUNT(id) as totalOrders, SUM(total_amount) as totalRevenue FROM orders", [], (err, row) => {
                    if (err) rej(err); else res(row);
                });
            }),
            // 2. Sales by Order Type
            new Promise((res, rej) => {
                db.all("SELECT order_type, COUNT(id) as count FROM orders GROUP BY order_type", [], (err, rows) => {
                    if (err) rej(err); else res(rows);
                });
            }),
            // 3. Sales by Payment Method
            new Promise((res, rej) => {
                db.all("SELECT payment_method, SUM(total_amount) as total FROM orders GROUP BY payment_method", [], (err, rows) => {
                    if (err) rej(err); else res(rows);
                });
            }),
            // 4. Top Selling Items
            new Promise((res, rej) => {
                const query = `
                    SELECT i.name, SUM(oi.quantity) as total_sold
                    FROM order_items oi
                    JOIN items i ON oi.item_id = i.id
                    GROUP BY oi.item_id
                    ORDER BY total_sold DESC
                    LIMIT 5
                `;
                db.all(query, [], (err, rows) => {
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

function submitOrder(cart, orderType, customerId, paymentMethod, discount) {
    return new Promise((resolve, reject) => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const taxRate = 0.15; // 15% VAT
        const taxAmount = (subtotal - discount) * taxRate;
        const total = subtotal - discount + taxAmount;

        db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);

            db.run(`INSERT INTO orders (subtotal, tax_amount, discount, total_amount, order_type, customer_id, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [subtotal, taxAmount, discount, total, orderType || 'Dine-in', customerId || null, paymentMethod || 'Cash'], function(err) {
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
                        db.run('COMMIT', (err) => {
                            if (err) return db.run('ROLLBACK', () => reject(err));
                            resolve({ orderId, total, subtotal, taxAmount, discount });
                        });
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
            if (row && new Date(row.expires_at) > new Date()) {
                resolve({ valid: true });
            } else {
                resolve({ valid: false });
            }
        });
    });
}

function activateLicense(key) {
    return new Promise((resolve, reject) => {
        if (key === VALID_KEY) {
            const currentMachineId = machineIdSync();
            const now = new Date();
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year license

            db.run(`INSERT INTO license (serial_key, activated_at, expires_at, machine_id) VALUES (?, ?, ?, ?)`,
            [key, now.toISOString(), expiresAt.toISOString(), currentMachineId], function(err) {
                if (err) return reject(err);
                resolve({ success: true, message: "Activation Successful! Valid for 1 year." });
            });
        } else {
            resolve({ success: false, message: "Invalid Serial Key." });
        }
    });
}

module.exports = {
    initDb,
    getCategories,
    getItems,
    submitOrder,
    checkLicense,
    activateLicense,
    getCustomerByPhone,
    saveCustomer,
    getDashboardStats,
    getInventory,
    addInventoryItem,
    addMenuItem,
    addRecipe,
    getSettings,
    saveSettings
};
