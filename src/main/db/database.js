const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { app } = require('electron');

let db;

function ensureKeysExist() {
    const userDataPath = app.getPath('userData');
    
    // Check possible locations for private key
    let privateKeyPath = path.join(userDataPath, 'private.pem');
    if (!fs.existsSync(privateKeyPath)) {
        privateKeyPath = path.join(app.getAppPath(), 'tools', 'private.pem');
        if (!fs.existsSync(privateKeyPath)) {
            privateKeyPath = path.join(__dirname, '..', '..', '..', 'tools', 'private.pem');
        }
    }

    // Check possible locations for public key
    let publicKeyPath = path.join(userDataPath, 'public.pem');
    if (!fs.existsSync(publicKeyPath)) {
        publicKeyPath = path.join(app.getAppPath(), 'src', 'main', 'public.pem');
        if (!fs.existsSync(publicKeyPath)) {
            publicKeyPath = path.join(__dirname, '..', 'public.pem');
        }
    }

    // If still neither exist in any location, generate them in userData
    if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        console.log("RSA keys not found. Generating new ones in userData path...");
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        
        privateKeyPath = path.join(userDataPath, 'private.pem');
        publicKeyPath = path.join(userDataPath, 'public.pem');
        
        fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
        fs.writeFileSync(publicKeyPath, publicKey, 'utf8');
        console.log("New RSA keys generated successfully.");
    }

    return { privateKeyPath, publicKeyPath };
}

// Secure pre-computed hash for the master password
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
        
        // Orders structure
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            total REAL NOT NULL, 
            status TEXT NOT NULL, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            is_synced INTEGER DEFAULT 0,
            type TEXT DEFAULT 'dine-in',
            customer_id INTEGER,
            driver_id INTEGER,
            shift_id INTEGER,
            discount_amount REAL DEFAULT 0,
            FOREIGN KEY (customer_id) REFERENCES customers (id),
            FOREIGN KEY (driver_id) REFERENCES drivers (id),
            FOREIGN KEY (shift_id) REFERENCES shifts (id)
        )`);
        
        db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, item_id INTEGER, quantity INTEGER NOT NULL, price REAL NOT NULL, notes TEXT, FOREIGN KEY (order_id) REFERENCES orders (id), FOREIGN KEY (item_id) REFERENCES items (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS license (id INTEGER PRIMARY KEY AUTOINCREMENT, serial_key TEXT NOT NULL, activated_at DATETIME, expires_at DATETIME, machine_id TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

        // Shifts & Cash
        db.run(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY AUTOINCREMENT, cashier_name TEXT, start_time DATETIME DEFAULT CURRENT_TIMESTAMP, end_time DATETIME, starting_cash REAL DEFAULT 0, actual_cash REAL, is_closed INTEGER DEFAULT 0, audited INTEGER DEFAULT 0)`);
        
        // Inventory Management
        db.run(`CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, unit TEXT NOT NULL, quantity REAL DEFAULT 0, low_stock_threshold REAL DEFAULT 10)`);
        db.run(`CREATE TABLE IF NOT EXISTS recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER, inventory_id INTEGER, quantity_required REAL NOT NULL, FOREIGN KEY (item_id) REFERENCES items (id), FOREIGN KEY (inventory_id) REFERENCES inventory (id))`);

        // Accounting & Purchasing
        db.run(`CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, total_cost REAL NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, received_at DATETIME, FOREIGN KEY (supplier_id) REFERENCES suppliers (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER, inventory_id INTEGER, quantity REAL NOT NULL, cost_per_unit REAL NOT NULL, FOREIGN KEY (po_id) REFERENCES purchase_orders (id), FOREIGN KEY (inventory_id) REFERENCES inventory (id))`);
        db.run(`CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, amount REAL NOT NULL, date DATETIME DEFAULT CURRENT_TIMESTAMP, shift_id INTEGER, FOREIGN KEY (shift_id) REFERENCES shifts (id))`);

        seedData();
    });
}

function seedData() {
    db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
        if (row && row.count === 0) {
            db.serialize(() => {
                db.run(`INSERT INTO categories (name) VALUES ('Main Course'), ('Beverages')`);
                db.run(`INSERT INTO inventory (name, unit, quantity) VALUES ('Beef Patty', 'pcs', 100), ('Bun', 'pcs', 100), ('Cola Syrup', 'L', 10)`);
                db.run(`INSERT INTO items (category_id, name, price, image_url) VALUES 
                    (1, 'Burger', 15.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80'),
                    (2, 'Cola', 5.00, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80')`);
                
                db.run(`INSERT INTO recipes (item_id, inventory_id, quantity_required) VALUES
                    (1, 1, 1),
                    (1, 2, 1),
                    (2, 3, 0.2)`);
            });
        }
    });
}

function verifyMasterPassword(password) {
    return new Promise((resolve) => {
        resolve(bcrypt.compareSync(password, MASTER_PASSWORD_HASH));
    });
}

function generateLicenseToken(days, targetMachineId) {
    return new Promise((resolve, reject) => {
        try {
            const machineId = targetMachineId || machineIdSync();
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + parseInt(days));

            const payload = {
                machineId: machineId,
                expiresAt: expirationDate.toISOString()
            };

            const { privateKeyPath } = ensureKeysExist();

            let privateKey = "";
            if (fs.existsSync(privateKeyPath)) {
                privateKey = fs.readFileSync(privateKeyPath, 'utf8');
            } else {
                console.error(`Private key not found at expected path: ${privateKeyPath}`);
                return reject(new Error(`Private key not found at: ${privateKeyPath}`));
            }

            const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
            resolve(token);
        } catch (e) {
            console.error('Error generating license token:', e);
            reject(e);
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
                const { publicKeyPath } = ensureKeysExist();
                if (!fs.existsSync(publicKeyPath)) {
                    console.error(`Public key not found at: ${publicKeyPath}`);
                    return resolve({ valid: false });
                }
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
            const { publicKeyPath } = ensureKeysExist();
            if (!fs.existsSync(publicKeyPath)) {
                console.error(`Public key not found at: ${publicKeyPath}`);
                return resolve({ success: false, message: "Public key missing. Cannot activate license." });
            }
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

module.exports = {
    initDb,
    verifyMasterPassword,
    generateLicenseToken,
    checkLicense,
    activateLicense
};
