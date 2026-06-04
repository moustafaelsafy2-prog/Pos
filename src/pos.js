let cart = [];
let categories = [];
let allItems = [];

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
    const container = document.getElementById('items-container');
    container.innerHTML = '';

    const filteredItems = categoryId
        ? allItems.filter(item => item.category_id === categoryId)
        : allItems;

    filteredItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-name">${item.name}</div>
            <div class="item-price">$${item.price.toFixed(2)}</div>
        `;
        card.onclick = () => addToCart(item);
        container.appendChild(card);
    });
}

function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...item, qty: 1 });
    }
    renderCart();
}

// Attach functions to window so inline onclick handlers in renderCart work.
// Alternatively we could attach event listeners dynamically, but this matches the existing HTML strings.
window.updateQty = function(id, delta) {
    const item = cart.find(c => c.id === id);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(c => c.id !== id);
        }
    }
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';

    let total = 0;

    cart.forEach(item => {
        const subtotal = item.price * item.qty;
        total += subtotal;

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} x ${item.qty}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="window.updateQty(${item.id}, -1)">-</button>
                <span>${item.qty}</span>
                <button class="qty-btn" onclick="window.updateQty(${item.id}, 1)">+</button>
            </div>
            <div style="font-weight: bold; width: 60px; text-align: right;">
                $${subtotal.toFixed(2)}
            </div>
        `;
        container.appendChild(row);
    });

    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

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
    if (!phone) return alert("Please enter a phone number");

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
            alert("Customer not found. Please fill in details to create a new one.");
        }
    } catch (e) {
        console.error("Error searching customer", e);
    }
});

document.getElementById('checkout-btn').addEventListener('click', async () => {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    let customerId = null;

    if (orderType === 'Delivery') {
        const phone = document.getElementById('cust-phone').value.trim();
        const name = document.getElementById('cust-name').value.trim();
        const address = document.getElementById('cust-address').value.trim();
        const idVal = document.getElementById('cust-id').value;

        if (!phone || !name || !address) {
            alert("Please fill all customer details for delivery.");
            return;
        }

        try {
            // Save or update customer
            customerId = await window.api.saveCustomer({
                id: idVal ? parseInt(idVal) : null,
                name,
                phone,
                address
            });
            document.getElementById('cust-id').value = customerId; // store the ID back
        } catch (e) {
            console.error("Failed to save customer:", e);
            alert("Failed to save customer data.");
            return;
        }
    }

    try {
        const result = await window.api.submitOrder(cart, orderType, customerId);
        alert(`Order #${result.orderId} (${orderType}) completed successfully! Total: $${result.total.toFixed(2)}`);

        // Reset Cart
        cart = [];
        renderCart();

        // Reset Form
        document.getElementById('cust-phone').value = "";
        document.getElementById('cust-name').value = "";
        document.getElementById('cust-address').value = "";
        document.getElementById('cust-id').value = "";
        document.querySelector('input[value="Dine-in"]').checked = true;
        document.getElementById('customer-info-panel').style.display = 'none';

    } catch (e) {
        console.error("Checkout failed:", e);
        alert("Failed to submit order. Check console.");
    }
});

// Initialization will be triggered after license check passes
window.initPOS = initPOS;
