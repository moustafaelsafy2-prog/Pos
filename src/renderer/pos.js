let cart = [];
let categories = [];
let allItems = [];
let currentDiscount = 0;
let currentSearchTerm = '';
let currentCategoryId = null;

async function initPOS() {
    try {
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
    const discountVal = prompt(window.t('add_discount') + " ($):", currentDiscount);
    if (discountVal !== null && discountVal.trim() !== '') {
        const parsed = parseFloat(discountVal);
        if (!isNaN(parsed) && parsed >= 0) {
            currentDiscount = parsed;
            renderCart();
        } else {
            alert("Invalid discount amount");
        }
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
        const result = await window.api.submitOrder(cart, orderType, customerId, currentPaymentMethod, currentDiscount);

        const translatedType = orderType === 'Dine-in' ? window.t('dine_in') : (orderType === 'Takeaway' ? window.t('takeaway') : window.t('delivery'));
        alert(window.t('order_success', { id: result.orderId, type: translatedType, total: result.total.toFixed(2) }));

        // Reset Everything
        cart = [];
        currentDiscount = 0;
        renderCart();

        document.getElementById('cust-phone').value = "";
        document.getElementById('cust-name').value = "";
        document.getElementById('cust-address').value = "";
        document.getElementById('cust-id').value = "";
        document.querySelector('input[value="Dine-in"]').checked = true;
        document.getElementById('customer-info-panel').style.display = 'none';

        document.getElementById('payment-modal').style.display = 'none';

    } catch (e) {
        console.error("Checkout failed:", e);
        alert(window.t('checkout_fail'));
    }
});

// Initialization will be triggered after license check passes
window.initPOS = initPOS;
