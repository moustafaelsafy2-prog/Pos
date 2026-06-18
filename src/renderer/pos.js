function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

let cart = [];
let categories = [];
let allItems = [];
let discountAmount = 0;
let discountType = null;
let currentSearchTerm = '';
let currentCategoryId = null;
let currentShiftId = null;

// Track Order State Globally
let currentOrderType = 'Takeaway';
let currentCustomerId = null;
let selectedTableId = null;

async function initPOS() {
    try {
        // Check Shift Status first using currentUser id
        const userId = window.currentUser ? window.currentUser.id : null;
        const shift = await window.api.getCurrentShift(userId);
        if (shift) {
            currentShiftId = shift.id;
            window.currentShiftId = shift.id; // Expose globally for other modules like accounting
            document.getElementById('current-cashier-name').textContent = shift.cashier_name;
        } else {
            window.currentShiftId = null;
            if (window.currentUser) {
                document.getElementById('shift-cashier-name').value = window.currentUser.username;
            }
            document.getElementById('open-shift-modal').style.display = 'flex';
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
    if (!window.currentShiftId) {
        alert('يجب فتح وردية أولاً');
        return;
    }

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

        const escapedNotes = escapeHtml(item.notes || '');
        let notesHtml = '';
        if (escapedNotes) {
            notesHtml = `<div style="font-size: 12px; color: var(--primary); margin-top: 4px;">📝 ${escapedNotes}</div>`;
        }

        row.innerHTML = `
            <div class="cart-item-info" style="cursor:pointer;" onclick="window.openNotes(${item.cartItemId})" title="Click to add notes">
                <div class="cart-item-name">${escapeHtml(item.name)}</div>
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
    const taxAmount = (subtotal - discountAmount) * taxRate;
    const finalTotal = subtotal - discountAmount + taxAmount;

    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-discount').textContent = `$${discountAmount.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `$${taxAmount.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${finalTotal.toFixed(2)}`;
}

// Discount & Hold
document.getElementById('discount-btn').addEventListener('click', () => {
    const discountVal = prompt(window.t('add_discount') + " (e.g., 5 for $5, or 10%):", discountAmount > 0 ? (discountType === 'percentage' ? (discountAmount / cart.reduce((sum, item) => sum + (item.price * item.qty), 0) * 100) + '%' : discountAmount) : '');
    if (discountVal !== null && discountVal.trim() !== '') {
        const val = discountVal.trim();
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

        let calculatedDiscount = 0;

        if (val.endsWith('%')) {
            const percentage = parseFloat(val.replace('%', ''));
            if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
                calculatedDiscount = subtotal * (percentage / 100);
                discountType = 'percentage';
            } else {
                return alert("Invalid percentage");
            }
        } else {
            const amount = parseFloat(val);
            if (!isNaN(amount) && amount >= 0) {
                calculatedDiscount = amount;
                discountType = 'fixed';
            } else {
                return alert("Invalid amount");
            }
        }

        if (calculatedDiscount > subtotal) {
            return alert("Discount cannot exceed subtotal");
        }

        discountAmount = calculatedDiscount;
        renderCart();
    } else if (discountVal === '') {
        discountAmount = 0;
        discountType = null;
        renderCart();
    }
});

let heldOrders = [];

document.getElementById('hold-btn').addEventListener('click', async () => {
    if (cart.length === 0) return;
    if (!currentShiftId) return alert(window.t('shift_required') || "You must open a shift first!");

    const driverId = currentOrderType === 'Delivery' ? document.getElementById('delivery-driver-select').value : null;
    const userId = window.currentUser ? window.currentUser.id : null;

    try {
        await window.api.suspendOrder(cart, currentOrderType, currentCustomerId, discountAmount, selectedTableId, driverId, userId, currentShiftId, discountType);
        cart = [];
        discountAmount = 0;
        discountType = null;
        currentCustomerId = null;
        selectedTableId = null;
        const custDisplay = document.getElementById('customer-display');
        if (custDisplay) custDisplay.innerHTML = '';
        renderCart();
        alert("Order suspended successfully!");
    } catch (e) {
        console.error("Failed to suspend order:", e);
        alert("Failed to suspend order.");
    }
});



document.getElementById('resume-btn').addEventListener('click', async () => {
    try {
        const orders = await window.api.getSuspendedOrders();
        if(!orders || orders.length === 0) return alert("No suspended orders.");

        const list = document.getElementById('suspended-orders-list');
        list.innerHTML = '';
        orders.forEach(o => {
            const div = document.createElement('div');
            div.style.padding = "10px";
            div.style.borderBottom = "1px solid #ccc";
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.innerHTML = `
                <div>
                    <strong>Order #${o.id}</strong> - ${o.order_type} - Total: ${o.total_amount.toFixed(2)}
                    <br><small>${new Date(o.order_date).toLocaleString()}</small>
                </div>
                <button class="custom-btn" style="background:var(--primary);" onclick="window.resumeOrder(${o.id}, '${encodeURIComponent(JSON.stringify(o))}')">Resume</button>
            `;
            list.appendChild(div);
        });
        document.getElementById('suspended-orders-modal').style.display = 'flex';
    } catch (e) {
        console.error(e);
    }
});

window.resumeOrder = async function(id, orderData) {
    try {
        const order = JSON.parse(decodeURIComponent(orderData));
        await window.api.deleteSuspendedOrder(id);

        cart = order.items.map(i => ({
            id: i.item_id,
            name: i.item_name,
            price: i.price,
            qty: i.quantity,
            cartItemId: i.id + Math.random(),
            notes: i.notes || ''
        }));

        currentOrderType = order.order_type;
        currentCustomerId = order.customer_id;
        discountAmount = order.discount_amount || order.discount;
        discountType = order.discount_type || null;
        selectedTableId = order.table_id;

        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        const typeBtn = document.querySelector(`[data-type="${currentOrderType}"]`);
        if(typeBtn) typeBtn.classList.add('active');

        document.getElementById('suspended-orders-modal').style.display = 'none';
        renderCart();
    } catch (e) {
        console.error(e);
    }
};


// Handle Order Type Change
document.querySelectorAll('input[name="orderType"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
        const customerPanel = document.getElementById('customer-info-panel');
        const tableSelect = document.getElementById('dinein-table-select');
        const driverSelect = document.getElementById('delivery-driver-select');
        const tablesMapBtn = document.getElementById('manage-tables-btn');

        currentOrderType = e.target.value;

        if (currentOrderType === 'Delivery') {
            customerPanel.style.display = 'block';
            tableSelect.style.display = 'none';
            tablesMapBtn.style.display = 'none';
            driverSelect.style.display = 'inline-block';

            // Fetch drivers
            try {
                const drivers = await window.api.getDrivers();
                driverSelect.innerHTML = '<option value="">Select Driver</option>';
                drivers.forEach(d => {
                    driverSelect.innerHTML += `<option value="${escapeHtml(d.id)}">${escapeHtml(d.name)}</option>`;
                });
            } catch (err) {
                console.error("Failed to load drivers", err);
            }

        } else if (currentOrderType === 'Dine-in') {
            customerPanel.style.display = 'none';
            tableSelect.style.display = 'inline-block';
            tablesMapBtn.style.display = 'inline-block';
            driverSelect.style.display = 'none';
        } else { // Takeaway
            customerPanel.style.display = 'none';
            tableSelect.style.display = 'none';
            tablesMapBtn.style.display = 'none';
            driverSelect.style.display = 'none';
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

        div.onclick = async () => {
            if (t.status === 'occupied') {
                try {
                    const order = await window.api.getOrder(t.active_order_id);
                    if (order) {
                        // Restore order to POS cart to add/remove items
                        cart = order.items.map(i => ({
                            id: i.item_id,
                            name: i.item_name,
                            price: i.price,
                            qty: i.quantity,
                            cartItemId: i.id + Math.random(),
                            notes: i.notes || ''
                        }));
                        currentOrderType = 'Dine-in';
                        document.querySelector('input[value="Dine-in"]').checked = true;

                        document.getElementById('dinein-table-select').value = t.id;
                        selectedTableId = t.id;
                        discountAmount = order.discount_amount || order.discount || 0;
                        discountType = order.discount_type || null;
                        currentCustomerId = order.customer_id;

                        // Set global tracking variable if we wanted to update instead of create new order,
                        // but for now, we will delete the old suspended order and re-suspend
                        await window.api.deleteSuspendedOrder(order.id);

                        renderCart();
                        document.getElementById('table-map-modal').style.display = 'none';
                    }
                } catch(e) {
                    console.error("Failed to load table order", e);
                    alert("Failed to load table order.");
                }
            } else {
                document.getElementById('dinein-table-select').value = t.id;
                selectedTableId = t.id;
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
    if (!window.currentShiftId) {
        alert('يجب فتح وردية أولاً' || window.t('open_shift_first'));
        return;
    }
    if (cart.length === 0) {
        alert(window.t('cart_empty'));
        return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;

    if (orderType === 'Delivery') {
        const driverId = document.getElementById('delivery-driver-select').value;
        if (!driverId) {
            alert('يجب اختيار مندوب لطلبات التوصيل' || window.t('select_driver'));
            return;
        }
        const phone = document.getElementById('cust-phone').value.trim();
        const name = document.getElementById('cust-name').value.trim();
        const address = document.getElementById('cust-address').value.trim();

        // Relaxed constraint to just driver, customer details optional in fast pos or can enforce:
        if (!phone && !name && !address) {
           // Allow delivery without customer if they just pick driver
        }
    } else if (orderType === 'Dine-in') {
        const tableId = document.getElementById('dinein-table-select').value;
        if (!tableId) {
            alert('يجب اختيار ترابيزة' || window.t('select_table'));
            return;
        }
        selectedTableId = tableId;
    }

    // Calculate total to populate payment modal
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const taxRate = 0.15;
    const taxAmount = (subtotal - discountAmount) * taxRate;
    const finalTotal = subtotal - discountAmount + taxAmount;

    // Open Payment Modal instead of direct submit
    document.getElementById('payment-modal').style.display = 'flex';
    document.getElementById('payment-amount-input').value = finalTotal.toFixed(2);
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
        const total = subtotal - discountAmount + ((subtotal - discountAmount) * 0.15);

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


document.getElementById('confirm-payment-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.disabled) return;

    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }

    // Check for negative quantities
    const invalidItems = cart.filter(i => i.qty <= 0 || i.price < 0);
    if (invalidItems.length > 0) {
        alert("Cart contains invalid items (negative price or quantity)");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    if (discountAmount > subtotal) {
        alert("Discount exceeds subtotal");
        return;
    }

    // Determine payment method via UI
    const activeMethodBtn = document.querySelector('.payment-btn.active');
    const paymentMethod = activeMethodBtn ? activeMethodBtn.getAttribute('data-method') : 'Cash';

    // We don't have use-points element in this design
    const pointsRedeemed = 0;

    const driverId = currentOrderType === 'Delivery' ? document.getElementById('delivery-driver-select').value : null;
    const userId = window.currentUser ? window.currentUser.id : null;

    try {
        btn.disabled = true;
        btn.textContent = "Processing...";

        const orderIdObj = await window.api.submitOrder(
            cart, currentOrderType, currentCustomerId, paymentMethod,
            discountAmount, currentShiftId, pointsRedeemed, selectedTableId, userId, driverId, discountType
        );

        const taxRate = 0.15;
        const taxAmount = (subtotal - discountAmount) * taxRate;
        const finalTotal = subtotal - discountAmount + taxAmount;

        // Uses the existing reliable receipt generator instead of undefined local alias
        await printReceipt(orderIdObj.orderId, cart, currentOrderType, subtotal, discountAmount, taxAmount, finalTotal, paymentMethod);

        cart = [];
        discountAmount = 0;
        discountType = null;
        currentCustomerId = null;
        selectedTableId = null;
        const custDisplay2 = document.getElementById('customer-display');
        if (custDisplay2) custDisplay2.innerHTML = '';
        renderCart();
        document.getElementById('payment-modal').style.display = 'none';

        if (currentOrderType === 'Dine-in') {
            if (typeof loadTables === 'function') loadTables();
            if (typeof renderTableMap === 'function' && document.getElementById('table-map-modal').style.display === 'flex') {
                renderTableMap();
            }
        }
    } catch (err) {
        console.error("Payment failed", err);
        alert("Payment failed: " + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = window.t('confirm_payment') || "Confirm Payment";
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
    const userId = window.currentUser ? window.currentUser.id : null;

    if (!name || isNaN(startingCash)) return alert(window.t('fill_all_fields'));
    if (!userId) return alert('No user logged in.');

    try {
        const shift = await window.api.openShift(userId, name, startingCash);
        currentShiftId = shift.id;
        window.currentShiftId = shift.id;
        document.getElementById('open-shift-modal').style.display = 'none';

        // Update top-right display
        document.getElementById('current-cashier-name').textContent = name;

        alert(`Shift opened successfully for ${name}.`);
    } catch (e) {
        console.error("Failed to open shift", e);
        alert(e.message || "Failed to open shift.");
    }
});

document.getElementById('close-shift-btn').addEventListener('click', () => {
    if (!window.currentShiftId) {
        alert('لا توجد وردية مفتوحة' || window.t('no_open_shift'));
        return;
    }
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
        document.getElementById('current-cashier-name').textContent = "No Shift";
        document.getElementById('shift-cashier-name').value = '';
        document.getElementById('shift-starting-cash').value = '';
        document.getElementById('shift-actual-cash').value = '';
        alert('Shift closed successfully.');
    } catch (e) {
        console.error(e);
        alert("Failed to close shift");
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
        if (window.currentShiftId) {
            alert('يوجد وردية مفتوحة بالفعل' || window.t('shift_already_open'));
            return;
        }
        if (window.currentUser) {
            document.getElementById('shift-cashier-name').value = window.currentUser.username;
        }
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
window.loadNetworkConfig = loadNetworkConfig;

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
