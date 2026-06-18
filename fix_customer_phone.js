const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const missingFuncs = `
function getCustomerByPhone(phone) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM customers WHERE phone = ?', [phone], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function saveCustomer(customer) {
    return new Promise((resolve, reject) => {
        if (customer.id) {
            db.run('UPDATE customers SET name = ?, address = ? WHERE id = ?', [customer.name, customer.address, customer.id], function(err) {
                if (err) reject(err);
                else resolve(customer.id);
            });
        } else {
            db.run('INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)', [customer.name, customer.phone, customer.address], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        }
    });
}
`;

if (!content.includes('function getCustomerByPhone(phone)')) {
    content = content.replace('module.exports = {', missingFuncs + '\nmodule.exports = {');
    fs.writeFileSync(filepath, content);
}
