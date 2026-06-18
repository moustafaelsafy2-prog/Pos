const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const missingFuncs = `
function getUnsyncedOrders() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM orders WHERE is_synced = 0", [], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
}

function markOrdersSynced(orderIds) {
    if(!orderIds || orderIds.length === 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const placeholders = orderIds.map(() => '?').join(',');
        db.run(\`UPDATE orders SET is_synced = 1 WHERE id IN (\${placeholders})\`, orderIds, function(err) {
            if (err) reject(err); else resolve(this.changes);
        });
    });
}
`;

if (!content.includes('function getUnsyncedOrders()')) {
    content = content.replace('module.exports = {', missingFuncs + '\nmodule.exports = {');
    fs.writeFileSync(filepath, content);
}
