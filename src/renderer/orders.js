async function loadTodayOrders() {
    try {
        const orders = await window.api.getTodayOrders();
        const tbody = document.getElementById('orders-tbody');
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--gray-text);">No orders found for today.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');

            const timeStr = new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let statusHtml = `<span>${order.status}</span>`;
            if (order.status === 'refunded') {
                statusHtml = `<span class="status-danger" data-i18n="refunded">${window.t('refunded') || 'Refunded'}</span>`;
            } else if (order.status === 'completed') {
                statusHtml = `<span class="status-ok">${window.t('completed') || 'Completed'}</span>`;
            } else {
                statusHtml = `<span class="status-warning">${order.status}</span>`;
            }

            let refundBtn = '';
            if (order.status !== 'refunded') {
                refundBtn = `<button class="custom-btn" style="padding: 6px 12px; background: var(--primary); margin: 0; width: auto;" onclick="window.refundOrder(${order.id})">
                                ${window.t('refund') || 'Refund'}
                             </button>`;
            }

            tr.innerHTML = `
                <td style="font-weight: 700;">#${order.id} <br><span style="font-size: 12px; color: var(--gray-text); font-weight: normal;">${order.customer_name || 'Guest'} - ${order.order_type}</span></td>
                <td style="color: var(--gray-text);">${timeStr}</td>
                <td style="font-weight: 700; color: var(--primary);">$${order.total_amount.toFixed(2)}</td>
                <td>${statusHtml}</td>
                <td>${refundBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load today's orders:", e);
    }
}

window.refundOrder = function(orderId) {
    document.getElementById('return-order-id').value = orderId;
    document.getElementById('return-options-modal').style.display = 'flex';
}

document.getElementById('cancel-return-btn').addEventListener('click', () => {
    document.getElementById('return-options-modal').style.display = 'none';
});

document.getElementById('full-return-btn').addEventListener('click', async () => {
    const orderId = document.getElementById('return-order-id').value;
    if (!orderId) return;

    if (!confirm(window.t('confirm_refund') || "Are you sure you want to refund this order? Items will be returned to stock.")) return;

    try {
        await window.api.refundOrder(orderId);
        alert(window.t('refund_success') || "Order refunded successfully.");
        document.getElementById('return-options-modal').style.display = 'none';
        loadTodayOrders();
    } catch (e) {
        console.error("Failed to refund order", e);
        alert("Failed to refund order.");
    }
});

document.getElementById('refresh-orders-btn').addEventListener('click', loadTodayOrders);

// Expose globally for tab switching
window.loadTodayOrders = loadTodayOrders;
