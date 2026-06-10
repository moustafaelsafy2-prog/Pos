function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

let cart = [];
let categories = [];
let allItems = [];
let currentDiscount = 0;
let currentSearchTerm = '';
let currentCategoryId = null;
let currentShiftId = null;

async function initPOS() {
    try {
        // Check Shift Status first
        const shift = await window.api.getCurrentShift();
        if (shift) {
            currentShiftId = shift.id;
            window.currentShiftId = shift.id; // Expose globally for other modules like accounting
            document.getElementById('open-shift-manual-btn').style.display = 'none'; // Hide button if shift is open
        } else {
            // Force user to open shift
            document.getElementById('open-shift-modal').style.display = 'flex';
        document.getElementById('open-shift-manual-btn').style.display = 'inline-block';
            document.getElementById('open-shift-manual-btn').style.display = 'inline-block';
        }

        categories = await window.api.getCategories();
        allItems = await window.api.getItems();

        renderCategories();
        if(categories.length > 0) {
            renderItems(categories[0].id);
        } else {
            renderItems(null);
        }
    } catch (e) {
        console.error("Failed to load POS data:", e);
    }
}

function renderCategories() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';

    categories.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${index === 0 ? 'active' : ''}`;
        btn.textContent = cat.name;
        btn.onclick = () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderItems(cat.id);
        };
        container.appendChild(btn);
    });
}

function renderItems(categoryId) {
    currentCategoryId = categoryId;
    const container = document.getElementById('items-container');
    container.innerHTML = '';

    let filteredItems = allItems;

    if (categoryId) {
        filteredItems = filteredItems.filter(item => item.category_id === categoryId);
    }

    if (currentSearchTerm) {
        filteredItems = filteredItems.filter(item => item.name.toLowerCase().includes(currentSearchTerm.toLowerCase()));
    }

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        let imageHtml = '';
        if (item.image_url) {
            imageHtml = `<div class="item-image" style="background-image: url('${item.image_url}')"></div>`;
        } else {
            const icon = item.category_id === 1 ? '🍔' : (item.category_id === 2 ? '🥤' : '🍰');
            imageHtml = `<div class="item-icon">${icon}</div>`;
        }

        card.innerHTML = `
            ${imageHtml}
            <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
            </div>
        `;
        card.onclick = () => addToCart(item);
        container.appendChild(card);
    });
}

// Search Logic
document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.trim();
    renderItems(currentCategoryId);
});

function addToCart(item) {
    // Generate unique ID for cart item to handle same item with different notes
    const cartItemId = Date.now() + Math.random();

    // Check if same item without notes exists to stack them
    const existing = cart.find(c => c.id === item.id && !c.notes);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1, cartItemId, notes: '' });
    }
    renderCart();
}

// Attach functions to window so inline onclick handlers in renderCart work.
// Alternatively we could attach event listeners dynamically, but this matches the existing HTML strings.
window.updateQty = function(cartItemId, delta) {
    const item = cart.find(c => c.cartItemId === cartItemId);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.cartItemId !== cartItemId);
        }
    }
    renderCart();
}

window.openNotes = function(cartItemId) {
    const item = cart.find(c => c.cartItemId === cartItemId);
    if (item) {
        document.getElementById('note-item-id').value = cartItemId;
        document.getElementById('item-notes-input').value = item.notes || '';
        document.getElementById('notes-modal').style.display = 'flex';
    }
}

document.getElementById('cancel-notes-btn').addEventListener('click', () => {
    document.getElementById('notes-modal').style.display = 'none';
});

document.getElementById('save-notes-btn').addEventListener('click', () => {
    const cartItemId = parseFloat(document.getElementById('note-item-id').value);
    const notes = document.getElementById('item-notes-input').value.trim();

    const item = cart.find(c => c.cartItemId === cartItemId);
    if (item) {
        item.notes = notes;
        renderCart();
    }
    document.getElementById('notes-modal').style.display = 'none';
});

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';

    let subtotal = 0;

    cart.forEach(item => {
        const itemSubtotal = item.price * item.qty;
        subtotal += itemSubtotal;

        const row = document.createElement('div');
        row.className = 'cart-item';

        let notesHtml = '';
        if (item.notes) {
            notesHtml = `<div style="font-size: 12px; color: var(--primary); margin-top: 4px;">📝 ${item.notes}</div>`;
        }

        row.innerHTML = `
            <div class="cart-item-info" style="cursor:pointer;" onclick="window.openNotes(${item.cartItemId})" title="Click to add notes">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.qty}</div>
                ${notesHtml}
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="window.updateQty(${item.cartItemId}, -1)">-</button>
                <span style="font-weight:600; min-width: 20px; text-align:center;">${item.qty}</span>
                <button class="qty-btn" onclick="window.updateQty(${item.cartItemId}, 1)">+</button>
            </div>
            <div class="cart-item-subtotal">
                $${itemSubtotal.toFixed(2)}
            </div>
        `;
        container.appendChild(row);
    });

    const taxRate = 0.15;
    const taxAmount = (subtotal - currentDiscount) * taxRate;
    const finalTotal = subtotal - currentDiscount + taxAmount;

    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-discount').textContent = `$${currentDiscount.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `$${taxAmount.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${finalTotal.toFixed(2)}`;
}

// Discount & Hold
document.getElementById('discount-btn').addEventListener('click', () => {
    const discountVal = prompt(window.t('add_discount') + " (e.g., 5 for $5, or 10%):", currentDiscount);
    if (discountVal !== null && discountVal.trim() !== '') {
        const val = discountVal.trim();
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        let calculatedDiscount = 0;

        if (val.endsWith('%')) {
            const percentage = parseFloat(val.replace('%', ''));
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
                calculatedDiscount = subtotal * (percentage / 100);
            } else {
                return alert("Invalid percentage");
            }
        } else {
            const amount = parseFloat(val);
            if (!isNaN(amount) && amount >= 0) {
                calculatedDiscount = amount;
            } else {
                return alert("Invalid amount");
            }
        }

        if (calculatedDiscount > subtotal) {
            return alert("Discount cannot exceed subtotal");
        }

        currentDiscount = calculatedDiscount;
        renderCart();
    }
});

let heldOrders = [];
document.getElementById('hold-btn').addEventListener('click', () => {
    if (cart.length === 0) return alert(window.t('cart_empty'));
    heldOrders.push([...cart]);
    cart = [];
    currentDiscount = 0;
    renderCart();
    alert(`Order held. (${heldOrders.length} currently held)`);
});

document.getElementById('resume-btn').addEventListener('click', () => {
    if (heldOrders.length === 0) return alert("No held orders");
    if (cart.length > 0) return alert("Please finish or hold the current order first");

    cart = heldOrders.pop();
    currentDiscount = 0;
    renderCart();
});

// Handle Order Type Change
document.querySelectorAll('input[name="orderType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const customerPanel = document.getElementById('customer-info-panel');
        if (e.target.value === 'Delivery') {
            customerPanel.style.display = 'block';
        } else {
            customerPanel.style.display = 'none';
        }
    });
});

// Handle Customer Search
document.getElementById('search-cust-btn').addEventListener('click', async () => {
    const phone = document.getElementById('cust-phone').value.trim();
    if (!phone) return alert(window.t('enter_phone'));

    try {
        const customer = await window.api.getCustomer(phone);
        if (customer) {
            document.getElementById('cust-id').value = customer.id;
            document.getElementById('cust-name').value = customer.name;
            document.getElementById('cust-address').value = customer.address;
        } else {
            document.getElementById('cust-id').value = "";
            document.getElementById('cust-name').value = "";
            document.getElementById('cust-address').value = "";
            alert(window.t('cust_not_found'));
        }
    } catch (e) {
        console.error("Error searching customer", e);
    }
});

let currentPaymentMethod = 'Cash';

// --- Table Map Management ---

let tablesList = [];
async function loadTables() {
    try {
        tablesList = await window.api.getTables();
        const select = document.getElementById('dinein-table-select');
        if (select) {
            select.innerHTML = '<option value="">No Table</option>';
            tablesList.forEach(t => {
                select.innerHTML += `<option value="${escapeHtml(t.id)}">${escapeHtml(t.table_number)}</option>`;
            });
        }
    } catch(e) {
        console.error(e);
    }
}

if (document.getElementById('manage-tables-btn')) {
    document.getElementById('manage-tables-btn').addEventListener('click', () => {
        document.getElementById('table-map-modal').style.display = 'flex';
        renderTableMap();
    });

    document.getElementById('close-table-map-btn').addEventListener('click', () => {
        document.getElementById('table-map-modal').style.display = 'none';
    });

    document.getElementById('add-table-btn').addEventListener('click', async () => {
        const tableName = document.getElementById('new-table-name').value.trim();
        if (!tableName) return;
        try {
            await window.api.addTable(tableName);
            document.getElementById('new-table-name').value = '';
            await loadTables();
            renderTableMap();
        } catch(e) {
            console.error(e);
            alert("Failed to add table");
        }
    });
}

function renderTableMap() {
    const grid = document.getElementById('table-map-grid');
    if(!grid) return;
    grid.innerHTML = '';

    tablesList.forEach(t => {
        const div = document.createElement('div');
        div.style.padding = '20px 10px';
        div.style.borderRadius = '12px';
        div.style.cursor = 'pointer';
        div.style.fontWeight = 'bold';

        if (t.status === 'occupied') {
            div.style.background = 'var(--primary)';
            div.style.color = 'white';
            div.innerHTML = `${escapeHtml(t.table_number)}<br><span style="font-size:10px;font-weight:normal;">Occupied</span>`;
        } else {
            div.style.background = 'white';
            div.style.color = 'var(--dark)';
            div.style.border = '1px solid var(--gray-border)';
            div.innerHTML = `${escapeHtml(t.table_number)}<br><span style="font-size:10px;font-weight:normal;">Free</span>`;
        }

        div.onclick = () => {
            if (t.status === 'occupied') {
                if (confirm(`Table ${t.table_number} is currently occupied. Do you want to open split-bill options?`)) {
                    openSplitBill(t.current_order_id, t.table_number);
                }
            } else {
                document.getElementById('dinein-table-select').value = t.id;
                document.getElementById('table-map-modal').style.display = 'none';
                document.querySelector('input[value="Dine-in"]').checked = true;
            }
        };

        grid.appendChild(div);
    });
}

async function openSplitBill(orderId, tableNumber) {
    if (!orderId) return alert("No active order found on this table.");

    document.getElementById('table-map-modal').style.display = 'none';
    const splitModal = document.getElementById('split-bill-modal');
    splitModal.style.display = 'flex';

    const itemsList = document.getElementById('split-items-list');
    itemsList.innerHTML = 'Loading items...';

    try {
        const items = await window.api.getOrderItems(orderId);
        itemsList.innerHTML = '';
        if (items && items.length > 0) {
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.innerHTML = `
                    <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                        <input type="checkbox" class="split-item-cb" value="${item.id}" data-item='${JSON.stringify(item)}'>
                        <span>${item.quantity}x ${item.name} ($${item.subtotal.toFixed(2)})</span>
                    </label>
                `;
                itemsList.appendChild(itemDiv);
            });
            document.getElementById('confirm-split-btn').setAttribute('data-order-id', orderId);
        } else {
            itemsList.innerHTML = 'No items available to split.';
        }
    } catch(e) {
        itemsList.innerHTML = 'Error loading items.';
        console.error(e);
    }
}

if (document.getElementById('cancel-split-btn')) {
    document.getElementById('cancel-split-btn').addEventListener('click', () => {
        document.getElementById('split-bill-modal').style.display = 'none';
    });

    document.getElementById('confirm-split-btn').addEventListener('click', async (e) => {
        const orderId = parseInt(e.target.getAttribute('data-order-id'));
        const checkboxes = document.querySelectorAll('.split-item-cb:checked');
        const selectedItemIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (selectedItemIds.length === 0) {
            return alert("Please select at least one item to split.");
        }

        if (!confirm("This will refund these items from the original bill and load them into a new cart to pay separately. Continue?")) return;

        try {
            await window.api.refundOrderItems(orderId, selectedItemIds);

            cart = [];
            Array.from(checkboxes).forEach(cb => {
                const parsed = JSON.parse(cb.getAttribute('data-item'));
                cart.push({
                    id: parsed.item_id,
                    cartItemId: Date.now() + Math.random(),
                    name: parsed.name,
                    price: parsed.subtotal / parsed.quantity,
                    qty: parsed.quantity,
                    notes: parsed.notes
                });
            });

            renderCart();
            document.getElementById('split-bill-modal').style.display = 'none';
            alert("Items split successfully. Please checkout the new cart.");
        } catch(err) {
            console.error(err);
            alert("Failed to split items.");
        }
    });
}

document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        alert(window.t('cart_empty'));
        return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;

    if (orderType === 'Delivery') {
        const phone = document.getElementById('cust-phone').value.trim();
        const name = document.getElementById('cust-name').value.trim();
        const address = document.getElementById('cust-address').value.trim();

        if (!phone || !name || !address) {
            alert(window.t('fill_all_cust'));
            return;
        }
    }

    // Open Payment Modal instead of direct submit
    document.getElementById('payment-modal').style.display = 'flex';
    document.getElementById('change-amount').textContent = "$0.00";
    setPaymentMethod('Cash');
});

function setPaymentMethod(method) {
    currentPaymentMethod = method;
    document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.payment-btn[data-method="${method}"]`).classList.add('active');

    if (method === 'Cash') {
        document.getElementById('cash-calculator').style.display = 'block';
    } else {
        document.getElementById('cash-calculator').style.display = 'none';
    }
}

document.querySelectorAll('.payment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        setPaymentMethod(e.currentTarget.getAttribute('data-method'));
    });
});

document.querySelectorAll('.quick-cash-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const val = parseFloat(e.currentTarget.getAttribute('data-val'));
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const total = subtotal - currentDiscount + ((subtotal - currentDiscount) * 0.15);

        const change = val - total;
        if (change >= 0) {
            document.getElementById('change-amount').textContent = `$${change.toFixed(2)}`;
        } else {
            document.getElementById('change-amount').textContent = "Not enough";
        }
    });
});

document.getElementById('cancel-payment-btn').addEventListener('click', () => {
    document.getElementById('payment-modal').style.display = 'none';
});

document.getElementById('confirm-payment-btn').addEventListener('click', async () => {
    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    let customerId = null;

    if (orderType === 'Delivery') {
        const phone = document.getElementById('cust-phone').value.trim();
        const name = document.getElementById('cust-name').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        const idVal = document.getElementById('cust-id').value;

        try {
            customerId = await window.api.saveCustomer({
                id: idVal ? parseInt(idVal) : null,
                name,
                phone,
                address
            });
        } catch (e) {
            console.error("Failed to save customer:", e);
            alert(window.t('save_cust_fail'));
            return;
        }
    }

    try {
        let tableId = null;
        if (orderType === 'Dine-in') {
            const tableSelect = document.getElementById('dinein-table-select');
            if (tableSelect && tableSelect.value) {
                tableId = parseInt(tableSelect.value);
            }
        }

        const processCheckout = async () => {
            // Note: pointsRedeemed variable requires initialization, let's use 0 safely or global
            const currentPointsRedeemed = typeof pointsRedeemed !== 'undefined' ? pointsRedeemed : 0;
            const result = await window.api.submitOrder(cart, orderType, customerId, currentPaymentMethod, currentDiscount, currentShiftId, currentPointsRedeemed, tableId);

            if (tableId) {
                if (typeof loadTables === 'function') await loadTables();
                if (typeof renderTableMap === 'function') renderTableMap();
            }

            // Print Receipt
            printReceipt(result.orderId, cart, orderType, result.subtotal, currentDiscount, result.taxAmount, result.total, currentPaymentMethod);

            // Print Kitchen / Station Tickets
            setTimeout(() => {
                if (typeof printStationTickets === 'function') printStationTickets(result.orderId, cart, orderType);
            }, 500);

            const translatedType = orderType === 'Dine-in' ? window.t('dine_in') : (orderType === 'Takeaway' ? window.t('takeaway') : window.t('delivery'));
            alert(window.t('order_success', { id: result.orderId, type: translatedType, total: result.total.toFixed(2) }));

            // Reset Everything
            cart = [];
            currentDiscount = 0;
            if (typeof pointsRedeemed !== 'undefined') pointsRedeemed = 0;
            window.currentCustomerPoints = 0;
            renderCart();

            document.getElementById('cust-phone').value = "";
            document.getElementById('cust-name').value = "";
            document.getElementById('cust-address').value = "";
            document.getElementById('cust-id').value = "";
            const loyaltyContainer = document.getElementById('loyalty-points-container');
            if (loyaltyContainer) loyaltyContainer.style.display = 'none';
            document.querySelector('input[value="Dine-in"]').checked = true;
            document.getElementById('customer-info-panel').style.display = 'none';

            document.getElementById('payment-modal').style.display = 'none';
        };

        if (currentPaymentMethod === 'Card') {
            // Simulate Payment Terminal Handshake
            document.getElementById('payment-modal').style.display = 'none';
            const terminalModal = document.getElementById('terminal-modal');
            if (terminalModal) terminalModal.style.display = 'flex';

            // Simulate 3 seconds of terminal processing time
            let terminalTimer = setTimeout(() => {
                if (terminalModal) terminalModal.style.display = 'none';
                processCheckout();
            }, 3000);

            const cancelBtn = document.getElementById('cancel-terminal-btn');
            if (cancelBtn) {
                cancelBtn.onclick = () => {
                    clearTimeout(terminalTimer);
                    if (terminalModal) terminalModal.style.display = 'none';
                    document.getElementById('payment-modal').style.display = 'flex';
                    alert("Terminal transaction cancelled by cashier.");
                };
            }
        } else {
            await processCheckout();
        }

    } catch (e) {
        console.error("Checkout failed:", e);
        alert(window.t('checkout_fail'));
        const terminalModal = document.getElementById('terminal-modal');
        if (terminalModal) terminalModal.style.display = 'none';
    }
});

async function printReceipt(orderId, orderCart, type, subtotal, discount, tax, total, paymentMethod) {
    try {
        const settings = await window.api.getSettings();
        const storeName = settings ? settings.store_name : "My Restaurant";
        const taxNumber = settings ? settings.tax_number : "";

        let itemsHtml = '';
        orderCart.forEach(item => {
            itemsHtml += `
                <div class="receipt-line-item">
                    <span>${item.qty}x ${item.name}</span>
                    <span>$${(item.price * item.qty).toFixed(2)}</span>
                </div>
            `;
            if (item.notes) {
                itemsHtml += `<div style="font-size: 10px; margin-left: 10px;">- ${item.notes}</div>`;
            }
        });

        const receiptContainer = document.getElementById('receipt-container');
        receiptContainer.innerHTML = `
            <div class="receipt-header">
                <h2>${storeName}</h2>
                <div>Tax No: ${taxNumber}</div>
                <div class="receipt-divider"></div>
                <div>Order #${orderId} | ${type}</div>
                <div>Date: ${new Date().toLocaleString()}</div>
            </div>
            <div class="receipt-divider"></div>
            ${itemsHtml}
            <div class="receipt-divider"></div>
            <div class="receipt-line-item"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
            <div class="receipt-line-item"><span>Discount:</span><span>-$${discount.toFixed(2)}</span></div>
            <div class="receipt-line-item"><span>VAT (15%):</span><span>$${tax.toFixed(2)}</span></div>
            <div class="receipt-line-item" style="font-weight: bold; font-size: 14px;"><span>Total:</span><span>$${total.toFixed(2)}</span></div>
            <div class="receipt-divider"></div>
            <div style="text-align: center;">Paid by: ${paymentMethod}</div>
            <div style="text-align: center; margin-top: 10px;">Thank You!</div>
        `;

        window.print();
    } catch (e) {
        console.error("Failed to print receipt", e);
    }
}

function printStationTickets(orderId, orderCart, type) {
    // Group items by printer_name
    const printerGroups = {};
    orderCart.forEach(item => {
        const printer = item.printer_name || 'Kitchen';
        if (!printerGroups[printer]) {
            printerGroups[printer] = [];
        }
        printerGroups[printer].push(item);
    });

    const kContainer = document.getElementById('kitchen-receipt-container');
    if (!kContainer) return;

    let fullHtml = '';

    for (const [printer, items] of Object.entries(printerGroups)) {
        let itemsHtml = '';
        items.forEach(item => {
            itemsHtml += `
                <div style="font-size: 16px; font-weight: bold; margin-bottom: 5px;">
                    ${item.qty}x ${item.name}
                </div>
            `;
            if (item.notes) {
                itemsHtml += `<div style="font-size: 14px; margin-left: 10px; font-weight: normal; font-style: italic;">- Notes: ${item.notes}</div>`;
            }
            itemsHtml += `<div class="receipt-divider"></div>`;
        });

        fullHtml += `
            <div style="text-align: center; font-family: monospace; padding-bottom: 20px; page-break-after: always;">
                <h1 style="margin: 0; font-size: 24px;">${printer.toUpperCase()} TICKET</h1>
                <h2 style="margin: 5px 0;">Order #${orderId} - ${type}</h2>
                <div>Time: ${new Date().toLocaleTimeString()}</div>
                <div class="receipt-divider"></div>
                <div style="text-align: left; margin-top: 10px;">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    kContainer.innerHTML = fullHtml;

    document.getElementById('receipt-container').style.display = 'none';
    const zReportContainer = document.getElementById('z-report-container');
    if (zReportContainer) zReportContainer.style.display = 'none';
    kContainer.style.display = 'block';

    window.print();

    kContainer.style.display = 'none';
    document.getElementById('receipt-container').style.display = 'block'; // Restore default
}

// Shift Management Logic
document.getElementById('submit-open-shift-btn').addEventListener('click', async () => {
    const name = document.getElementById('shift-cashier-name').value.trim();
    const startingCash = parseFloat(document.getElementById('shift-starting-cash').value);

    if (!name || isNaN(startingCash)) return alert(window.t('fill_all_fields'));

    try {
        const shift = await window.api.openShift(name, startingCash);
        currentShiftId = shift.id;
        window.currentShiftId = shift.id;
        document.getElementById('open-shift-modal').style.display = 'none';
        document.getElementById('open-shift-manual-btn').style.display = 'none';
    } catch (e) {
        console.error("Failed to open shift", e);
    }
});

document.getElementById('close-shift-btn').addEventListener('click', () => {
    document.getElementById('close-shift-modal').style.display = 'flex';
});

document.getElementById('cancel-close-shift-btn').addEventListener('click', () => {
    document.getElementById('close-shift-modal').style.display = 'none';
});

document.getElementById('submit-close-shift-btn').addEventListener('click', async () => {
    const actualCash = parseFloat(document.getElementById('shift-actual-cash').value);
    if (isNaN(actualCash)) return alert(window.t('fill_all_fields'));

    try {
        const result = await window.api.closeShift(actualCash, currentShiftId);
        document.getElementById('close-shift-modal').style.display = 'none';

        await printZReport(currentShiftId, result.expected_cash, result.actual_cash);

        currentShiftId = null;
        window.currentShiftId = null;
        document.getElementById('shift-cashier-name').value = '';
        document.getElementById('shift-starting-cash').value = '';
        document.getElementById('shift-actual-cash').value = '';
        document.getElementById('open-shift-modal').style.display = 'flex';

    } catch (e) {
        console.error("Failed to close shift", e);
    }
});

async function printZReport(shiftId, expected, actual) {
    try {
        const report = await window.api.getZReport(shiftId);
        const settings = await window.api.getSettings();
        const storeName = settings ? settings.store_name : "My Restaurant";

        let salesHtml = '';
        report.sales.forEach(s => {
            salesHtml += `<div class="receipt-line-item"><span>${s.payment_method}:</span><span>$${s.total.toFixed(2)}</span></div>`;
        });

        let refundsHtml = '';
        if (report.refunds && report.refunds.count > 0) {
            refundsHtml = `
                <hr class="receipt-divider">
                <div class="receipt-line-item"><span>Refunds (${report.refunds.count}):</span><span>-$${(report.refunds.total || 0).toFixed(2)}</span></div>
            `;
        }

        const diff = actual - expected;
        const diffText = diff === 0 ? 'Perfect' : (diff > 0 ? `Over (+$${diff.toFixed(2)})` : `Short (-$${Math.abs(diff).toFixed(2)})`);

        const container = document.getElementById('z-report-container');
        container.innerHTML = `
            <div class="receipt-header">
                <h2>${storeName}</h2>
                <div>Z-REPORT (EOD)</div>
                <div>Shift #${shiftId}</div>
                <div>Cashier: ${report.shift.cashier_name}</div>
                <div>End: ${new Date().toLocaleString()}</div>
            </div>
            <div class="receipt-divider"></div>
            <h3 style="margin: 5px 0;">Sales Summary</h3>
            ${salesHtml}
            ${refundsHtml}
            <div class="receipt-divider"></div>
            <h3 style="margin: 5px 0;">Cash Drawer</h3>
            <div class="receipt-line-item"><span>Starting Cash:</span><span>$${report.shift.starting_cash.toFixed(2)}</span></div>
            <div class="receipt-line-item"><span>Expected Cash:</span><span>$${expected.toFixed(2)}</span></div>
            <div class="receipt-line-item"><span>Actual Cash:</span><span>$${actual.toFixed(2)}</span></div>
            <div class="receipt-divider"></div>
            <div class="receipt-line-item" style="font-weight: bold;"><span>Discrepancy:</span><span>${diffText}</span></div>
            <div style="text-align: center; margin-top: 20px;">Manager Signature</div>
            <div style="border-bottom: 1px solid #000; margin: 20px 20px 0 20px;"></div>
        `;

        // Hide receipt container if it exists, show z-report
        document.getElementById('receipt-container').style.display = 'none';
        document.getElementById('z-report-container').style.display = 'block';
        window.print();
        document.getElementById('z-report-container').style.display = 'none';
    } catch (e) {
        console.error(e);
    }
}

// Initialization will be triggered after license check passes

// Wire up manual start shift button if it exists
const startShiftBtn = document.getElementById('open-shift-manual-btn');
if (startShiftBtn) {
    startShiftBtn.addEventListener('click', () => {
        document.getElementById('open-shift-modal').style.display = 'flex';
    });
}

window.initPOS = initPOS;


// Network Config UI
async function loadNetworkConfig() {
    if(window.api.getNetworkConfig) {
        const config = await window.api.getNetworkConfig();
        const modeSelect = document.getElementById('network-mode');
        const ipInput = document.getElementById('network-server-ip');
        if(modeSelect && ipInput) {
            modeSelect.value = config.mode || 'server';
            ipInput.value = config.serverIp || '127.0.0.1';
            ipInput.style.display = config.mode === 'client' ? 'block' : 'none';

            modeSelect.addEventListener('change', (e) => {
                ipInput.style.display = e.target.value === 'client' ? 'block' : 'none';
            });
        }
    }
}

if(document.getElementById('save-network-btn')) {
    document.getElementById('save-network-btn').addEventListener('click', async () => {
        const mode = document.getElementById('network-mode').value;
        const ip = document.getElementById('network-server-ip').value || '127.0.0.1';
        if(window.api.saveNetworkConfig) {
            await window.api.saveNetworkConfig(mode, ip);
            alert("Network settings saved. The application must be restarted to apply changes.");
        }
    });
}
