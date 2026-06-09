async function loadStaffData() {
    try {
        const users = await window.api.getUsers();
        const tbody = document.getElementById('staff-tbody');
        tbody.innerHTML = '';

        if (!users || users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray-text);">No staff found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600; color: var(--dark);">${user.name}</td>
                <td style="color: var(--gray-text);">${window.t(user.role) || user.role}</td>
                <td>
                    <button class="custom-btn" style="padding: 6px 12px; background: var(--primary); margin: 0; width: auto;" onclick="window.deleteStaff(${user.id})">
                        ${window.t('delete') || 'Delete'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Failed to load staff data:", e);
    }
}

document.getElementById('add-staff-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-staff-name').value.trim();
    const username = document.getElementById('new-staff-username').value.trim();
    const password = document.getElementById('new-staff-pin').value.trim();
    const role = document.getElementById('new-staff-role').value;

    if (!name || !pin || pin.length !== 4) {
        return alert(window.t('fill_all_fields') || "Please fill all fields correctly (PIN must be 4 digits).");
    }

    try {
        await window.api.addUser(name, username, password, role);
        alert(window.t('save_success') || "Saved successfully!");
        document.getElementById('new-staff-name').value = '';
        document.getElementById('new-staff-username').value = '';
        document.getElementById('new-staff-pin').value = '';
        loadStaffData();
    } catch (e) {
        console.error(e);
        alert("Failed to add staff (PIN might already be in use).");
    }
});

window.deleteStaff = async function(id) {
    if (!confirm(window.t('confirm_delete') || "Are you sure you want to delete this user?")) return;
    try {
        await window.api.deleteUser(id);
        loadStaffData();
    } catch (e) {
        console.error(e);
        alert("Failed to delete staff.");
    }
}

document.getElementById('refresh-staff-btn').addEventListener('click', loadStaffData);

window.loadStaffData = loadStaffData;
