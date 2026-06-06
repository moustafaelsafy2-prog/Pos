async function loadAccountingData() {
    await loadExpenses();
    await loadShiftsAudit();
    await loadPurchaseOrders();
}

// --- Expenses ---
async function loadExpenses() {
    try {
        const expenses = await window.api.getExpenses();
        const tbody = document.getElementById('expenses-tbody');
        tbody.innerHTML = '';

        if (!expenses || expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No expenses recorded.</td></tr>`;
            return;
        }

        expenses.forEach(exp => {
            const tr = document.createElement('tr');
            const dateStr = new Date(exp.expense_date).toLocaleDateString();
            tr.innerHTML = `
                <td style="color: var(--gray-text);">${dateStr}</td>
                <td style="font-weight: 600;">${exp.category}<br><span style="font-size: 10px; color: var(--gray-text); font-weight: normal;">${exp.description || ''}</span></td>
                <td style="color: var(--primary); font-weight: bold;">$${exp.amount.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load expenses:", e);
    }
}

document.getElementById('add-expense-btn').addEventListener('click', async () => {
    const category = document.getElementById('new-expense-category').value;
    const amount = parseFloat(document.getElementById('new-expense-amount').value);
    const desc = document.getElementById('new-expense-desc').value.trim();

    if (isNaN(amount) || amount <= 0) {
        return alert("Please enter a valid expense amount.");
    }

    try {
        // Pass currentShiftId if we want to tie it to the open shift, else null
        const shiftId = typeof window.currentShiftId !== 'undefined' ? window.currentShiftId : null;
        await window.api.addExpense(category, amount, desc, shiftId);

        document.getElementById('new-expense-amount').value = '';
        document.getElementById('new-expense-desc').value = '';
        loadExpenses();
    } catch (e) {
        console.error(e);
        alert("Failed to record expense.");
    }
});

// --- Shift Auditing ---
async function loadShiftsAudit() {
    try {
        const shifts = await window.api.getShiftsForAudit();
        const tbody = document.getElementById('shifts-audit-tbody');
        tbody.innerHTML = '';

        if (!shifts || shifts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No past shifts found.</td></tr>`;
            return;
        }

        shifts.forEach(shift => {
            const tr = document.createElement('tr');

            let statusBadge = '';
            let actionBtn = '';

            if (shift.status === 'open') {
                statusBadge = `<span class="status-warning">Open</span>`;
                actionBtn = `<span style="font-size: 12px; color: var(--gray-text);">Cannot Audit</span>`;
            } else if (shift.is_audited) {
                statusBadge = `<span class="status-ok">Audited</span>`;
                actionBtn = `<span style="font-size: 12px; color: var(--secondary);">Verified ✓</span>`;
            } else {
                statusBadge = `<span class="status-danger">Pending Audit</span>`;
                actionBtn = `<button class="custom-btn" style="padding: 4px 8px; font-size: 12px; background: var(--dark); margin: 0; width: auto;" onclick="window.auditShift(${shift.id})">Mark Audited</button>`;
            }

            tr.innerHTML = `
                <td style="font-weight: 600;">#${shift.id}<br><span style="font-size: 10px; color: var(--gray-text); font-weight: normal;">${new Date(shift.start_time).toLocaleDateString()}</span></td>
                <td>${shift.cashier_name}</td>
                <td style="display: flex; gap: 10px; align-items: center;">${statusBadge} ${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load shifts for audit:", e);
    }
}

window.auditShift = async function(id) {
    if (!confirm("Are you sure you want to mark this shift as audited and verified?")) return;
    try {
        await window.api.auditShift(id);
        loadShiftsAudit();
    } catch (e) {
        console.error(e);
        alert("Failed to audit shift.");
    }
}

// --- Purchase Orders ---
async function loadPurchaseOrders() {
    try {
        const pos = await window.api.getPurchaseOrders();
        const tbody = document.getElementById('po-tbody');
        tbody.innerHTML = '';

        if (!pos || pos.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--gray-text);">No purchase orders found.</td></tr>`;
            return;
        }

        pos.forEach(po => {
            const tr = document.createElement('tr');
            const dateStr = new Date(po.order_date).toLocaleDateString();

            let statusBadge = po.status === 'received' ? `<span class="status-ok">Received</span>` : `<span class="status-warning">Pending</span>`;
            let actionBtn = po.status === 'received' ? '' : `<button class="custom-btn" style="padding: 4px 8px; font-size: 12px; background: var(--secondary); margin: 0; width: auto;" onclick="window.receivePO(${po.id})">Mark Received</button>`;

            tr.innerHTML = `
                <td style="font-weight: 600;">PO-${po.id}</td>
                <td>${po.supplier_name}</td>
                <td style="color: var(--gray-text);">${dateStr}</td>
                <td style="font-weight: bold;">$${po.total_amount.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load POs:", e);
    }
}

window.receivePO = async function(id) {
    if (!confirm("Mark this PO as received? Inventory stock will be automatically updated.")) return;
    try {
        await window.api.receivePurchaseOrder(id);
        loadPurchaseOrders();
        // Also optionally refresh inventory if we had an event bus, but standard tab switch will handle it
    } catch (e) {
        console.error(e);
        alert("Failed to receive PO.");
    }
}

// --- PO Wizard Logic ---
let poCart = [];
let poSuppliers = [];
let poInventory = [];

document.getElementById('new-po-btn').addEventListener('click', async () => {
    poCart = [];
    renderPOCart();

    // Load suppliers and inventory for selects
    poSuppliers = await window.api.getSuppliers();
    poInventory = await window.api.getInventory();

    const supSelect = document.getElementById('po-supplier-select');
    supSelect.innerHTML = poSuppliers.length === 0 ? '<option value="">No suppliers found</option>' : '';
    poSuppliers.forEach(s => {
        supSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    const invSelect = document.getElementById('po-inventory-select');
    invSelect.innerHTML = '';
    poInventory.forEach(i => {
        invSelect.innerHTML += `<option value="${i.id}">${i.name} (${i.unit})</option>`;
    });

    document.getElementById('create-po-modal').style.display = 'flex';
});

document.getElementById('cancel-po-btn').addEventListener('click', () => {
    document.getElementById('create-po-modal').style.display = 'none';
});

document.getElementById('po-add-item-btn').addEventListener('click', () => {
    const invId = parseInt(document.getElementById('po-inventory-select').value);
    const qty = parseFloat(document.getElementById('po-item-qty').value);
    const cost = parseFloat(document.getElementById('po-item-cost').value);

    if (isNaN(invId) || isNaN(qty) || isNaN(cost) || qty <= 0 || cost < 0) {
        return alert("Please fill item details correctly.");
    }

    const invItem = poInventory.find(i => i.id === invId);
    poCart.push({
        inventory_id: invId,
        name: invItem.name,
        quantity: qty,
        unit_cost: cost
    });

    document.getElementById('po-item-qty').value = '';
    document.getElementById('po-item-cost').value = '';
    renderPOCart();
});

function renderPOCart() {
    const tbody = document.getElementById('po-cart-tbody');
    tbody.innerHTML = '';
    let total = 0;

    poCart.forEach((item, index) => {
        const subtotal = item.quantity * item.unit_cost;
        total += subtotal;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--gray-border);">
                <td style="padding: 10px;">${item.name}</td>
                <td style="padding: 10px;">${item.quantity}</td>
                <td style="padding: 10px;">$${item.unit_cost.toFixed(2)}</td>
                <td style="padding: 10px;">$${subtotal.toFixed(2)}</td>
                <td style="padding: 10px;">
                    <button onclick="poCart.splice(${index}, 1); renderPOCart();" style="background:none; border:none; color:var(--primary); cursor:pointer;">❌</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('po-total-display').textContent = total.toFixed(2);
}

document.getElementById('submit-po-btn').addEventListener('click', async () => {
    const supplierId = parseInt(document.getElementById('po-supplier-select').value);
    const expectedDate = document.getElementById('po-expected-date').value;

    if (isNaN(supplierId) || !expectedDate) return alert("Please select a supplier and expected date.");
    if (poCart.length === 0) return alert("Please add at least one item to the order.");

    try {
        await window.api.createPurchaseOrder(supplierId, expectedDate, poCart);
        alert("Purchase Order created successfully.");
        document.getElementById('create-po-modal').style.display = 'none';
        loadPurchaseOrders();
    } catch(e) {
        console.error(e);
        alert("Failed to create PO.");
    }
});

// Simple refresh wrapper
document.getElementById('refresh-accounting-btn').addEventListener('click', loadAccountingData);

window.loadAccountingData = loadAccountingData;