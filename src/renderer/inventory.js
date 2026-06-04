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
                <td style="display: flex; gap: 8px;">
                    <button class="custom-btn" style="padding: 6px 12px; background: var(--secondary); margin: 0; width: auto;" onclick="window.editInventory(${item.id}, '${item.name.replace(/'/g, "\\'")}', '${item.unit}', ${item.current_stock}, ${item.low_stock_threshold})">
                        ${window.t('edit') || 'Edit'}
                    </button>
                    <button class="custom-btn" style="padding: 6px 12px; background: var(--primary); margin: 0; width: auto;" onclick="window.deleteInventory(${item.id})">
                        ${window.t('delete') || 'Delete'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load inventory data:", e);
    }
}

document.getElementById('refresh-inventory-btn').addEventListener('click', loadInventoryData);

let editingInventoryId = null;

// Add/Edit Inventory Item Form inside Inventory Tab
document.getElementById('add-inv-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-inv-name').value.trim();
    const unit = document.getElementById('new-inv-unit').value.trim();
    const stock = parseFloat(document.getElementById('new-inv-stock').value);
    const thresh = parseFloat(document.getElementById('new-inv-thresh').value);

    if (!name || !unit || isNaN(stock) || isNaN(thresh)) {
        return alert(window.t('fill_all_fields') || "Please fill all fields correctly.");
    }

    try {
        if (editingInventoryId) {
            await window.api.updateInventoryItem(editingInventoryId, name, unit, stock, thresh);
            editingInventoryId = null;
            document.getElementById('add-inv-btn').textContent = window.t('save') || 'Save';
        } else {
            await window.api.addInventoryItem(name, unit, stock, thresh);
        }
        alert(window.t('save_success') || "Saved successfully!");
        document.getElementById('new-inv-name').value = '';
        document.getElementById('new-inv-unit').value = '';
        document.getElementById('new-inv-stock').value = '';
        document.getElementById('new-inv-thresh').value = '';
        loadInventoryData(); // Refresh table
    } catch (e) {
        console.error(e);
        alert("Failed to save inventory item.");
    }
});

window.editInventory = function(id, name, unit, stock, thresh) {
    editingInventoryId = id;
    document.getElementById('new-inv-name').value = name;
    document.getElementById('new-inv-unit').value = unit;
    document.getElementById('new-inv-stock').value = stock;
    document.getElementById('new-inv-thresh').value = thresh;

    document.getElementById('add-inv-btn').textContent = window.t('edit') || 'Edit';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.deleteInventory = async function(id) {
    if (!confirm("Are you sure you want to delete this inventory item? Associated recipes will also be deleted.")) return;
    try {
        await window.api.deleteInventoryItem(id);
        loadInventoryData();
    } catch (e) {
        console.error(e);
        alert("Failed to delete inventory item.");
    }
}

// Expose globally for tab switching
window.loadInventoryData = loadInventoryData;
