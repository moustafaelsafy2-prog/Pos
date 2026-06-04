// Populate dropdowns when settings tab is opened
async function loadSettingsData() {
    try {
        const categories = await window.api.getCategories();
        const items = await window.api.getItems();
        const inventory = await window.api.getInventory();

        // Populate Category Dropdown
        const catSelect = document.getElementById('new-menu-category');
        catSelect.innerHTML = `<option value="" disabled selected>${window.t('select_category') || 'Select Category'}</option>`;
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = window.t(cat.name.toLowerCase().replace(' ', '_')) || cat.name;
            catSelect.appendChild(opt);
        });

        // Populate Recipe Item Dropdown
        const itemSelect = document.getElementById('recipe-menu-item');
        itemSelect.innerHTML = `<option value="" disabled selected>${window.t('select_menu_item')}</option>`;
        items.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.name;
            itemSelect.appendChild(opt);
        });

        // Populate Recipe Inventory Dropdown
        const invSelect = document.getElementById('recipe-inv-item');
        invSelect.innerHTML = `<option value="" disabled selected>${window.t('select_inv_item')}</option>`;
        inventory.forEach(inv => {
            const opt = document.createElement('option');
            opt.value = inv.id;
            opt.textContent = `${inv.name} (${inv.unit})`;
            invSelect.appendChild(opt);
        });

    } catch (e) {
        console.error("Failed to load settings data:", e);
    }
}

// Add Inventory Item
document.getElementById('add-inv-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-inv-name').value.trim();
    const unit = document.getElementById('new-inv-unit').value.trim();
    const stock = parseFloat(document.getElementById('new-inv-stock').value);
    const thresh = parseFloat(document.getElementById('new-inv-thresh').value);

    if (!name || !unit || isNaN(stock) || isNaN(thresh)) {
        return alert(window.t('fill_all_fields') || "Please fill all fields correctly.");
    }

    try {
        await window.api.addInventoryItem(name, unit, stock, thresh);
        alert(window.t('save_success') || "Saved successfully!");
        document.getElementById('new-inv-name').value = '';
        document.getElementById('new-inv-unit').value = '';
        document.getElementById('new-inv-stock').value = '';
        document.getElementById('new-inv-thresh').value = '';
        loadSettingsData(); // Refresh dropdowns
    } catch (e) {
        console.error(e);
        alert("Failed to save inventory item.");
    }
});

// Add Menu Item
document.getElementById('add-menu-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-menu-name').value.trim();
    const catId = parseInt(document.getElementById('new-menu-category').value);
    const price = parseFloat(document.getElementById('new-menu-price').value);
    const img = document.getElementById('new-menu-image').value.trim();

    if (!name || isNaN(catId) || isNaN(price)) {
        return alert(window.t('fill_all_fields') || "Please fill all fields correctly.");
    }

    try {
        await window.api.addMenuItem(catId, name, price, img);
        alert(window.t('save_success') || "Saved successfully!");
        document.getElementById('new-menu-name').value = '';
        document.getElementById('new-menu-category').value = '';
        document.getElementById('new-menu-price').value = '';
        document.getElementById('new-menu-image').value = '';
        loadSettingsData(); // Refresh dropdowns
        if (window.initPOS) window.initPOS(); // Refresh POS cache
    } catch (e) {
        console.error(e);
        alert("Failed to save menu item.");
    }
});

// Link Recipe
document.getElementById('add-recipe-btn').addEventListener('click', async () => {
    const itemId = parseInt(document.getElementById('recipe-menu-item').value);
    const invId = parseInt(document.getElementById('recipe-inv-item').value);
    const qty = parseFloat(document.getElementById('recipe-qty').value);

    if (isNaN(itemId) || isNaN(invId) || isNaN(qty)) {
        return alert(window.t('fill_all_fields') || "Please fill all fields correctly.");
    }

    try {
        await window.api.addRecipe(itemId, invId, qty);
        alert(window.t('save_success') || "Recipe linked successfully!");
        document.getElementById('recipe-menu-item').value = '';
        document.getElementById('recipe-inv-item').value = '';
        document.getElementById('recipe-qty').value = '';
    } catch (e) {
        console.error(e);
        alert("Failed to link recipe.");
    }
});

// Expose load function
window.loadSettingsData = loadSettingsData;
