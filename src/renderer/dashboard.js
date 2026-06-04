let typeChartInstance = null;
let paymentChartInstance = null;

// Tab Switching Logic
window.switchTab = function(tabId) {
    // Update active class on nav links
    document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
    document.getElementById(`nav-${tabId}`).classList.add('active');

    // Hide all main containers
    document.getElementById('main-pos').style.display = 'none';
    document.getElementById('right-panel').style.display = 'none'; // Right panel belongs to POS
    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('main-inventory').style.display = 'none';
    document.getElementById('under-construction-panel').style.display = 'none';

    // Show selected container
    if (tabId === 'pos') {
        document.getElementById('main-pos').style.display = 'flex';
        document.getElementById('right-panel').style.display = 'flex';
    } else if (tabId === 'dashboard') {
        document.getElementById('main-dashboard').style.display = 'flex';
        loadDashboardData();
    } else if (tabId === 'inventory') {
        document.getElementById('main-inventory').style.display = 'flex';
        if(window.loadInventoryData) window.loadInventoryData();
    } else {
        // Placeholder for other tabs (Customers, Settings)
        document.getElementById('under-construction-panel').style.display = 'flex';
    }
};

async function loadDashboardData() {
    try {
        const stats = await window.api.getDashboardStats();

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

document.getElementById('refresh-dashboard-btn').addEventListener('click', loadDashboardData);
