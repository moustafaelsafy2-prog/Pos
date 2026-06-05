window.currentUser = null;
let typeChartInstance = null;
let paymentChartInstance = null;

let pendingTabId = null;

// Tab Switching Logic
window.switchTab = function(tabId) {
    // Only Admin can access these tabs, and RBAC hides the buttons anyway.
    // If somehow a cashier tries to access, block them.
    if (window.currentUser && window.currentUser.role === 'cashier' && tabId !== 'pos' && tabId !== 'orders' && tabId !== 'kds') {
        return alert("Access Denied");
    }
    executeTabSwitch(tabId);
};

async function executeTabSwitch(tabId) {
    // Update active class on nav links
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(`nav-${tabId}`).classList.add('active');

    // Hide all main containers
    document.getElementById('main-pos').style.display = 'none';
    document.getElementById('right-panel').style.display = 'none'; // Right panel belongs to POS
    document.getElementById('main-orders').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('main-inventory').style.display = 'none';
    document.getElementById('main-delivery').style.display = 'none';
    document.getElementById('main-settings').style.display = 'none';
    document.getElementById('main-customers').style.display = 'none';
    document.getElementById('main-kds').style.display = 'none';
    const staffPanel = document.getElementById('main-staff');
    if (staffPanel) staffPanel.style.display = 'none';
    document.getElementById('under-construction-panel').style.display = 'none';

    // Show selected container
    if (tabId === 'pos') {
        document.getElementById('main-pos').style.display = 'flex';
        document.getElementById('right-panel').style.display = 'flex';
    } else if (tabId === 'orders') {
        document.getElementById('main-orders').style.display = 'flex';
        if(window.loadTodayOrders) window.loadTodayOrders();
    } else if (tabId === 'kds') {
        document.getElementById('main-kds').style.display = 'flex';
        if(window.loadKDSData) window.loadKDSData();
    } else if (tabId === 'dashboard') {
        document.getElementById('main-dashboard').style.display = 'flex';
        loadDashboardData();
    } else if (tabId === 'inventory') {
        document.getElementById('main-inventory').style.display = 'flex';
        if(window.loadInventoryData) window.loadInventoryData();
    } else if (tabId === 'delivery') {
        document.getElementById('main-delivery').style.display = 'flex';
        if(window.loadDeliveryData) window.loadDeliveryData();
    } else if (tabId === 'menu') {
        document.getElementById('main-menu').style.display = 'flex';
        if(window.loadMenuManagementData) window.loadMenuManagementData();
    } else if (tabId === 'settings') {
        document.getElementById('main-settings').style.display = 'flex';
        if(window.loadSettingsData) window.loadSettingsData();
    } else if (tabId === 'customers') {
        document.getElementById('main-customers').style.display = 'flex';
        if(window.loadCustomersData) window.loadCustomersData();
    } else if (tabId === 'staff') {
        document.getElementById('main-staff').style.display = 'flex';
        if(window.loadStaffData) window.loadStaffData();
    } else {
        document.getElementById('under-construction-panel').style.display = 'flex';
    }
}

document.getElementById('cancel-pin-btn').addEventListener('click', () => {
    document.getElementById('pin-modal').style.display = 'none';
    pendingTabId = null;
});

document.getElementById('login-btn').addEventListener('click', async () => {
    const pin = document.getElementById('login-pin-input').value;
    try {
        const user = await window.api.loginUser(pin);
        if (user) {
            window.currentUser = user;
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app-container').style.display = 'flex';

            // Apply RBAC UI changes
            applyRoleRestrictions(user.role);

            // Start POS
            if(window.initPOS) window.initPOS();
        } else {
            alert(window.t('invalid_pin') || 'Invalid PIN');
            document.getElementById('login-pin-input').value = '';
        }
    } catch (e) {
        console.error("Login failed:", e);
    }
});

function applyRoleRestrictions(role) {
    if (role === 'cashier') {
        document.getElementById('nav-dashboard').style.display = 'none';
        document.getElementById('nav-menu').style.display = 'none';
        document.getElementById('nav-inventory').style.display = 'none';
        const deliveryNav = document.getElementById('nav-delivery');
        if(deliveryNav) deliveryNav.style.display = 'none';
        document.getElementById('nav-settings').style.display = 'none';
        document.getElementById('nav-customers').style.display = 'none';
        const staffNav = document.getElementById('nav-staff');
        if(staffNav) staffNav.style.display = 'none';
    } else {
        document.getElementById('nav-dashboard').style.display = 'flex';
        document.getElementById('nav-menu').style.display = 'flex';
        document.getElementById('nav-inventory').style.display = 'flex';
        const deliveryNav = document.getElementById('nav-delivery');
        if(deliveryNav) deliveryNav.style.display = 'flex';
        document.getElementById('nav-settings').style.display = 'flex';
        document.getElementById('nav-customers').style.display = 'flex';
        const staffNav = document.getElementById('nav-staff');
        if(staffNav) staffNav.style.display = 'flex';
    }
}

let currentStartDate = null;
let currentEndDate = null;

async function loadDashboardData() {
    try {
        const stats = await window.api.getDashboardStats(currentStartDate, currentEndDate);

        // Populate KPIs
        const totalRev = stats.overview.totalRevenue || 0;
        const totalOrd = stats.overview.totalOrders || 0;
        const avgOrd = totalOrd > 0 ? (totalRev / totalOrd) : 0;

        document.getElementById('kpi-revenue').textContent = `$${totalRev.toFixed(2)}`;
        document.getElementById('kpi-orders').textContent = totalOrd;
        document.getElementById('kpi-avg').textContent = `$${avgOrd.toFixed(2)}`;

        // Render Top Items
        const topItemsContainer = document.getElementById('top-items-list');
        topItemsContainer.innerHTML = '';
        if (stats.topItems && stats.topItems.length > 0) {
            stats.topItems.forEach(item => {
                const row = document.createElement('div');
                row.className = 'top-item-row';
                row.innerHTML = `
                    <div class="top-item-name">${item.name}</div>
                    <div class="top-item-qty">${item.total_sold} x</div>
                `;
                topItemsContainer.appendChild(row);
            });
        } else {
            topItemsContainer.innerHTML = `<div style="color:var(--gray-text);">No sales data yet.</div>`;
        }

        // Render Charts
        renderCharts(stats.byType, stats.byPayment);

    } catch (e) {
        console.error("Failed to load dashboard data:", e);
    }
}

function renderCharts(byType, byPayment) {
    // Destroy existing instances if they exist to prevent hover glitches
    if (typeChartInstance) typeChartInstance.destroy();
    if (paymentChartInstance) paymentChartInstance.destroy();

    // Setup Colors
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#FF5A5F';
    const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#00A699';
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--dark').trim() || '#222222';

    // 1. Order Type Doughnut Chart
    const ctxType = document.getElementById('typeChart').getContext('2d');
    const typeLabels = byType.map(row => window.t(row.order_type.toLowerCase().replace('-', '_')) || row.order_type);
    const typeData = byType.map(row => row.count);

    typeChartInstance = new Chart(ctxType, {
        type: 'doughnut',
        data: {
            labels: typeLabels,
            datasets: [{
                data: typeData,
                backgroundColor: [primary, secondary, dark],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // 2. Payment Method Bar Chart
    const ctxPayment = document.getElementById('paymentChart').getContext('2d');
    const paymentLabels = byPayment.map(row => window.t(row.payment_method.toLowerCase()) || row.payment_method);
    const paymentData = byPayment.map(row => row.total);

    paymentChartInstance = new Chart(ctxPayment, {
        type: 'bar',
        data: {
            labels: paymentLabels,
            datasets: [{
                label: window.t('total_revenue'),
                data: paymentData,
                backgroundColor: primary,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

document.getElementById('filter-dashboard-btn').addEventListener('click', () => {
    const start = document.getElementById('dash-start-date').value;
    const end = document.getElementById('dash-end-date').value;

    if (start && end) {
        currentStartDate = start;
        currentEndDate = end;
        document.getElementById('clear-filter-btn').style.display = 'block';
        loadDashboardData();
    } else {
        alert("Please select both start and end dates");
    }
});

document.getElementById('clear-filter-btn').addEventListener('click', () => {
    document.getElementById('dash-start-date').value = '';
    document.getElementById('dash-end-date').value = '';
    currentStartDate = null;
    currentEndDate = null;
    document.getElementById('clear-filter-btn').style.display = 'none';
    loadDashboardData();
});

document.getElementById('refresh-dashboard-btn').addEventListener('click', loadDashboardData);
