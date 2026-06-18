const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const newSuspendOrder = `function suspendOrder(cart, orderType, customerId, discountAmount, tableId, driverId, userId, shiftId, discountType) {
    return new Promise(async (resolve, reject) => {
        let subtotal = 0;
        cart.forEach(item => { subtotal += item.price * item.qty; });
        const totalAfterDiscount = subtotal - discountAmount;
        const taxAmount = totalAfterDiscount * 0.15;
        const totalAmount = totalAfterDiscount + taxAmount;

        console.log(\`[DB] Suspending order... Shift: \${shiftId}, User: \${userId}, Table: \${tableId}\`);
        try {
            await dbRunPromise("BEGIN TRANSACTION");
            const orderRes = await dbRunPromise(
                \`INSERT INTO orders (shift_id, user_id, customer_id, driver_id, table_id, order_type, subtotal, tax_amount, discount, total_amount, status, is_settled, discount_type, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'suspended', 0, ?, ?)\`,
                [shiftId, userId, customerId, driverId, tableId, orderType, subtotal, taxAmount, discountAmount, totalAmount, discountType, discountAmount]
            );

            const orderId = orderRes.lastID;
            console.log(\`[DB] Suspended order created with ID: \${orderId}\`);

            for (const item of cart) {
                const itemSubtotal = item.price * item.qty;
                await dbRunPromise(
                    \`INSERT INTO order_items (order_id, item_id, quantity, subtotal, notes) VALUES (?, ?, ?, ?, ?)\`,
                    [orderId, item.id, item.qty, itemSubtotal, item.notes || '']
                );
            }

            if (tableId && orderType === 'Dine-in') {
                console.log(\`[DB] Updating table \${tableId} to occupied\`);
                await dbRunPromise(\`UPDATE restaurant_tables SET status = 'occupied', active_order_id = ? WHERE id = ?\`, [orderId, tableId]);
            }

            await dbRunPromise("COMMIT");
            resolve(orderId);
        } catch (error) {
            console.error(\`[DB ERROR] Suspending order failed:\`, error);
            try {
                await dbRunPromise("ROLLBACK");
            } catch (rollbackErr) {
                console.error("[DB ERROR] Rollback failed:", rollbackErr);
            }
            reject(error);
        }
    });
}`;

content = content.replace(/function suspendOrder\([^)]*\)\s*{[\s\S]*?(?=function getSuspendedOrders)/, newSuspendOrder + '\n\n');
fs.writeFileSync(filepath, content);
