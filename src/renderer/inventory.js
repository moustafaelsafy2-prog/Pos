async function loadInventoryData() {
    try {
        const inventory = await window.api.getInventory();
        const tbody = document.getElementById('inventory-tbody');
        tbody.innerHTML = '';

        if (!inventory || inventory.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--gray-text);">No inventory data found.</td></tr>`;
            return;
        }

        inventory.forEach(item => {
            const tr = document.createElement('tr');

            // Determine Status
            let statusClass = 'status-ok';
            let statusTextKey = 'status_ok';

            if (item.current_stock <= 0) {
                statusClass = 'status-danger';
                statusTextKey = 'status_danger';
            } else if (item.current_stock <= item.low_stock_threshold) {
                statusClass = 'status-warning';
                statusTextKey = 'status_warning';
            }

            tr.innerHTML = `
                <td>${item.name}</td>
                <td style="font-weight: 700; color: var(--dark);">${item.current_stock.toFixed(2)}</td>
                <td style="color: var(--gray-text);">${item.unit}</td>
                <td>
                    <span class="${statusClass}" data-i18n="${statusTextKey}">
                        ${window.t(statusTextKey)}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load inventory data:", e);
    }
}

document.getElementById('refresh-inventory-btn').addEventListener('click', loadInventoryData);

// Expose globally for tab switching
window.loadInventoryData = loadInventoryData;
