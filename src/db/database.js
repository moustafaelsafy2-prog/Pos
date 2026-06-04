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
        db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, total_amount REAL NOT NULL, order_date DATETIME DEFAULT CURRENT_TIMESTAMP, status TEXT DEFAULT 'pending', FOREIGN KEY (customer_id) REFERENCES customers (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_id INTEGER, quantity INTEGER NOT NULL, subtotal REAL NOT NULL, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (item_id) REFERENCES items (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS license (id INTEGER PRIMARY KEY AUTOINCREMENT, serial_key TEXT, activated_at DATETIME, expires_at DATETIME, machine_id TEXT)`);

        // Seed initial data if empty
        db.get('SELECT COUNT(*) AS count FROM categories', [], (err, row) => {
            if (!err && row.count === 0) {
                db.run(`INSERT INTO categories (name) VALUES ('Main Course'), ('Drinks'), ('Desserts')`);
                db.run(`INSERT INTO items (category_id, name, price) VALUES (1, 'Burger', 5.99), (1, 'Pizza', 8.99), (2, 'Cola', 1.99), (2, 'Water', 0.99), (3, 'Ice Cream', 2.99)`);
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

function submitOrder(cart) {
    return new Promise((resolve, reject) => {
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        db.run(`INSERT INTO orders (total_amount) VALUES (?)`, [total], function(err) {
            if (err) return reject(err);
            const orderId = this.lastID;

            const stmt = db.prepare(`INSERT INTO order_items (order_id, item_id, quantity, subtotal) VALUES (?, ?, ?, ?)`);
            cart.forEach(item => {
                stmt.run(orderId, item.id, item.qty, item.price * item.qty);
            });
            stmt.finalize();
            resolve({ orderId, total });
        });
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
    activateLicense
};
