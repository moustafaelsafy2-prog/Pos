async function checkLicense() {
    try {
        const result = await window.api.checkLicense();
        const licenseStatusSpan = document.getElementById('license-status');
        const modal = document.getElementById('license-modal');
        const mainPos = document.getElementById('main-pos');

        if (result.valid) {
            licenseStatusSpan.textContent = "Licensed";
            licenseStatusSpan.style.color = "#4CAF50";
            modal.style.display = "none";
            mainPos.style.display = "flex";
            if(window.initPOS) window.initPOS();
        } else {
            licenseStatusSpan.textContent = "Unlicensed";
            licenseStatusSpan.style.color = "#F44336";
            modal.style.display = "flex";
            mainPos.style.display = "none";
        }
    } catch (e) {
        console.error("License check error:", e);
    }
}

document.getElementById('activate-btn').addEventListener('click', async () => {
    const key = document.getElementById('serial-key-input').value.trim();
    const errorMsg = document.getElementById('license-error');

    try {
        const res = await window.api.activateLicense(key);
        if (res.success) {
            alert(res.message);
            errorMsg.style.display = "none";
            checkLicense();
        } else {
            errorMsg.textContent = res.message;
            errorMsg.style.display = "block";
        }
    } catch(e) {
        errorMsg.textContent = "Database error. Please try again.";
        errorMsg.style.display = "block";
    }
});

// Run check on load
checkLicense();
