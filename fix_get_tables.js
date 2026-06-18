const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const missingFuncs = `
function getTables() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM restaurant_tables', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addTable(tableNumber) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO restaurant_tables (table_number) VALUES (?)', [tableNumber], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

function getWastage() {
    return new Promise((resolve, reject) => {
        const q = \`SELECT w.*, i.name as item_name, i.unit FROM wastage w JOIN inventory i ON w.inventory_id = i.id ORDER BY w.log_date DESC\`;
        db.all(q, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addWastage(invId, qty, reason) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('INSERT INTO wastage (inventory_id, quantity, reason) VALUES (?, ?, ?)', [invId, qty, reason]);
            db.run('UPDATE inventory SET current_stock = current_stock - ? WHERE id = ?', [qty, invId], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                } else {
                    db.run('COMMIT');
                    resolve(true);
                }
            });
        });
    });
}
`;

if (!content.includes('function getTables()')) {
    content = content.replace('module.exports = {', missingFuncs + '\nmodule.exports = {');
    fs.writeFileSync(filepath, content);
}
