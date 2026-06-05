let currentDriversList = [];

async function loadDeliveryData() {
    try {
        currentDriversList = await window.api.getDrivers();

        // 1. Render Drivers Table
        const dBody = document.getElementById('drivers-tbody');
        dBody.innerHTML = '';
        if (!currentDriversList || currentDriversList.length === 0) {
            dBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No drivers found.</td></tr>`;
        } else {
            currentDriversList.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 600;">${d.name}</td>
                    <td style="color: var(--gray-text);">${d.phone}</td>
                    <td>
                        <button class="custom-btn" style="padding: 6px 12px; background: var(--primary); margin: 0; width: auto;" onclick="window.deleteDriver(${d.id})">
                            ${window.t('delete') || 'Delete'}
                        </button>
                    </td>
                `;
                dBody.appendChild(tr);
            });
        }

        // 2. Render Unassigned Orders
        const unassigned = await window.api.getUnassignedDeliveries();
        const dispatchList = document.getElementById('dispatch-list');
        dispatchList.innerHTML = '';
        if (!unassigned || unassigned.length === 0) {
            dispatchList.innerHTML = `<div style="color: var(--gray-text); text-align: center; padding: 20px;">No pending deliveries.</div>`;
        } else {
            // Build driver options
            let optionsHtml = `<option value="" disabled selected>${window.t('assign_driver') || 'Assign Driver'}</option>`;
            currentDriversList.forEach(d => {
                optionsHtml += `<option value="${d.id}">${d.name}</option>`;
            });

            unassigned.forEach(order => {
                const div = document.createElement('div');
                div.className = 'dispatch-item';
                div.innerHTML = `
                    <div>
                        <div style="font-weight: 700;">#${order.id} - ${order.customer_name}</div>
                        <div style="font-size: 13px; color: var(--gray-text);">${order.address}</div>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <select class="custom-input" style="padding: 8px; margin: 0;" onchange="window.assignDriver(${order.id}, this.value)">
                            ${optionsHtml}
                        </select>
                    </div>
                `;
                dispatchList.appendChild(div);
            });
        }

        // 3. Render Driver Settlements
        const settlements = await window.api.getDriverSettlements();
        const settleList = document.getElementById('settlements-list');
        settleList.innerHTML = '';
        if (!settlements || settlements.length === 0) {
            settleList.innerHTML = `<div style="color: var(--gray-text); text-align: center; padding: 20px;">No pending cash settlements.</div>`;
        } else {
            settlements.forEach(s => {
                const div = document.createElement('div');
                div.className = 'settlement-item';
                div.innerHTML = `
                    <div>
                        <div style="font-weight: 700;">${s.name}</div>
                        <div style="font-size: 13px; color: var(--gray-text);">${s.orders_count} Orders</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="font-weight: 700; color: var(--primary); font-size: 18px;">$${s.total_cash_due.toFixed(2)}</div>
                        <button class="custom-btn" style="background: var(--secondary); padding: 8px 16px; margin: 0; width: auto;" onclick="window.settleDriver(${s.id})">
                            ${window.t('settle') || 'Settle'}
                        </button>
                    </div>
                `;
                settleList.appendChild(div);
            });
        }

    } catch (e) {
        console.error("Failed to load delivery data:", e);
    }
}

document.getElementById('refresh-delivery-btn').addEventListener('click', loadDeliveryData);

document.getElementById('add-driver-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-driver-name').value.trim();
    const phone = document.getElementById('new-driver-phone').value.trim();

    if (!name || !phone) return alert(window.t('fill_all_fields'));

    try {
        await window.api.addDriver(name, phone);
        document.getElementById('new-driver-name').value = '';
        document.getElementById('new-driver-phone').value = '';
        loadDeliveryData();
    } catch (e) {
        console.error(e);
        alert("Failed to add driver.");
    }
});

window.deleteDriver = async function(id) {
    if (!confirm(window.t('confirm_delete') || "Are you sure you want to delete this driver?")) return;
    try {
        await window.api.deleteDriver(id);
        loadDeliveryData();
    } catch (e) {
        console.error(e);
    }
}

window.assignDriver = async function(orderId, driverId) {
    if (!driverId) return;
    try {
        await window.api.assignDriver(orderId, driverId);
        loadDeliveryData();
    } catch (e) {
        console.error(e);
    }
}

window.settleDriver = async function(driverId) {
    if (!confirm("Are you sure you want to settle cash for this driver?")) return;
    try {
        await window.api.settleDriver(driverId);
        loadDeliveryData();
    } catch (e) {
        console.error(e);
    }
}

window.loadDeliveryData = loadDeliveryData;
