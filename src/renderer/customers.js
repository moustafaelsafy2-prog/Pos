async function loadCustomersData() {
    try {
        const customers = await window.api.getAllCustomers();
        const tbody = document.getElementById('customers-tbody');
        tbody.innerHTML = '';

        if (!customers || customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No customers found.</td></tr>`;
            return;
        }

        customers.forEach(cust => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--dark);">${cust.name}</td>
                <td style="color: var(--gray-text);">${cust.phone}</td>
                <td>${cust.address}</td>
            `;
            tr.addEventListener('click', () => showCustomerOrders(cust.id));
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load customers data:", e);
    }
}

async function showCustomerOrders(customerId) {
    try {
        const orders = await window.api.getCustomerOrders(customerId);
        const tbody = document.getElementById('customer-orders-tbody');
        tbody.innerHTML = '';

        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No orders found.</td></tr>`;
        } else {
            orders.forEach(order => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(order.order_date).toLocaleString()}</td>
                    <td style="font-weight: 700; color: var(--primary);">$${order.total_amount.toFixed(2)}</td>
                    <td>${order.status}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        document.getElementById('customer-orders-modal').style.display = 'flex';
    } catch (e) {
        console.error("Failed to load customers data:", e);
    }
}

document.getElementById('refresh-customers-btn').addEventListener('click', loadCustomersData);

document.getElementById('close-orders-modal-btn').addEventListener('click', () => {
    document.getElementById('customer-orders-modal').style.display = 'none';
});

window.loadCustomersData = loadCustomersData;
