const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const helperFunctions = `
function dbRunPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbAllPromise(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
`;

if (!content.includes('dbRunPromise')) {
    content = content.replace('function submitOrder', helperFunctions + '\nfunction submitOrder');
}

const newSubmitOrder = `function submitOrder(cart, orderType, customerId, paymentMethod, discountAmount = 0, shiftId = null, pointsRedeemed = 0, tableId = null, userId = null, driverId = null, discountType = null) {
    return new Promise(async (resolve, reject) => {
        let subtotal = 0;
        cart.forEach(item => subtotal += (item.price * item.qty));
        let total = subtotal - discountAmount;
        let taxAmount = total * 0.15;
        total += taxAmount;

        try {
            await dbRunPromise('BEGIN EXCLUSIVE TRANSACTION');

            const orderRes = await dbRunPromise(
                \`INSERT INTO orders (order_type, status, subtotal, discount, tax_amount, total_amount, customer_id, payment_method, shift_id, table_id, user_id, driver_id, discount_type, discount_amount)
                 VALUES (?, 'Completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\`,
                [orderType, subtotal, discountAmount, taxAmount, total, customerId, paymentMethod, shiftId, tableId, userId, driverId, discountType, discountAmount]
            );
            const orderId = orderRes.lastID;

            if (cart.length === 0) {
                await dbRunPromise('COMMIT');
                return resolve({ orderId, subtotal, discountAmount, taxAmount, total });
            }

            for (const item of cart) {
                await dbRunPromise(
                    \`INSERT INTO order_items (order_id, item_id, quantity, subtotal) VALUES (?, ?, ?, ?)\`,
                    [orderId, item.id, item.qty, item.price * item.qty]
                );

                const recipeRows = await dbAllPromise(\`SELECT inventory_id, quantity_required FROM recipes WHERE item_id = ?\`, [item.id]);
                for (const r of recipeRows) {
                    const qtyToDeduct = r.quantity_required * item.qty;
                    await dbRunPromise(\`UPDATE inventory SET current_stock = current_stock - ? WHERE id = ?\`, [qtyToDeduct, r.inventory_id]);
                }
            }

            if (tableId && orderType === 'Dine-in') {
                await dbRunPromise(\`UPDATE restaurant_tables SET status = 'available', active_order_id = NULL WHERE id = ?\`, [tableId]);
            }

            await dbRunPromise('COMMIT');
            resolve({ orderId, subtotal, discountAmount, taxAmount, total });
        } catch (error) {
            console.error("[DB ERROR] submitOrder transaction failed:", error);
            try {
                await dbRunPromise('ROLLBACK');
            } catch (rollbackErr) {
                console.error("[DB ERROR] Rollback failed:", rollbackErr);
            }
            reject(error);
        }
    });
}`;

content = content.replace(/function submitOrder\([^)]*\)\s*{[\s\S]*?(?=function suspendOrder)/, newSubmitOrder + '\n\n');
fs.writeFileSync(filepath, content);
