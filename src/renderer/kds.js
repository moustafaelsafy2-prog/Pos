async function loadKDSData() {
    try {
        const orders = await window.api.getPendingOrders();
        const grid = document.getElementById('kds-grid');
        grid.innerHTML = '';

        if (!orders || orders.length === 0) {
            grid.innerHTML = `<h2 style="grid-column: 1/-1; text-align: center; color: var(--gray-text);">No pending orders</h2>`;
            return;
        }

        orders.forEach(order => {
            const ticket = document.createElement('div');
            ticket.className = 'kds-ticket';

            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `<div class="kds-item">${item.quantity}x ${item.name}</div>`;
                if (item.notes) {
                    // Sanitize notes
                    const noteDiv = document.createElement('div');
                    noteDiv.textContent = `📝 ${item.notes}`;
                    itemsHtml += `<div class="kds-note">${noteDiv.innerHTML}</div>`;
                }
            });

            const timeStr = new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // Translate order type
            const translatedType = order.order_type === 'Dine-in' ? window.t('dine_in') : (order.order_type === 'Takeaway' ? window.t('takeaway') : window.t('delivery'));

            ticket.innerHTML = `
                <div class="kds-header">
                    <div class="kds-id">#${order.id}</div>
                    <div class="kds-type">${translatedType || order.order_type}</div>
                </div>
                <div class="kds-items">
                    ${itemsHtml}
                </div>
                <div class="kds-footer">
                    <div class="kds-time">⏱️ ${timeStr}</div>
                    <button class="kds-ready-btn" onclick="window.markOrderReady(${order.id})">${window.t('ready') || 'Ready'}</button>
                </div>
            `;
            grid.appendChild(ticket);
        });
    } catch (e) {
        console.error("Failed to load KDS data:", e);
    }
}

window.markOrderReady = async function(orderId) {
    try {
        await window.api.markOrderReady(orderId);
        loadKDSData(); // Refresh KDS screen
    } catch (e) {
        console.error("Failed to mark order ready", e);
    }
};

document.getElementById('refresh-kds-btn').addEventListener('click', loadKDSData);

window.loadKDSData = loadKDSData;
