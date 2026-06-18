const fs = require('fs');

const filepath = 'src/main/db/database.js';
let content = fs.readFileSync(filepath, 'utf8');

const licenseFunctions = `
function checkLicense() {
    return new Promise((resolve, reject) => {
        const currentMachineId = machineIdSync();
        db.get(\`SELECT * FROM license WHERE machine_id = ? ORDER BY id DESC LIMIT 1\`, [currentMachineId], (err, row) => {
            if (err) return reject(err);

            if (!row) return resolve({ valid: false });

            try {
                const { publicKeyPath } = ensureKeysExist();
                if (!fs.existsSync(publicKeyPath)) {
                    console.error(\`Public key not found at: \${publicKeyPath}\`);
                    return resolve({ valid: false });
                }
                const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
                // Verify the JWT stored in the database
                const decoded = jwt.verify(row.serial_key, publicKey, { algorithms: ['RS256'] });

                // Ensure the token was generated for THIS specific machine
                if (decoded.machineId !== currentMachineId) {
                    return resolve({ valid: false });
                }

                const currentTime = new Date();
                const expiresAt = new Date(decoded.expiresAt);
                const activatedAt = new Date(row.activated_at);

                // Check expiration and time rollback exploit (current time cannot be before activation time)
                if (currentTime < activatedAt) {
                    console.warn("Time rollback detected!");
                    resolve({ valid: false });
                } else if (currentTime < expiresAt) {
                    resolve({ valid: true });
                } else {
                    resolve({ valid: false });
                }
            } catch (error) {
                // Token is invalid, tampered with, or expired
                resolve({ valid: false });
            }
        });
    });
}

function activateLicense(token) {
    return new Promise((resolve, reject) => {
        try {
            const currentMachineId = machineIdSync();
            const { publicKeyPath } = ensureKeysExist();
            if (!fs.existsSync(publicKeyPath)) {
                console.error(\`Public key not found at: \${publicKeyPath}\`);
                return resolve({ success: false, message: "Public key missing. Cannot activate license." });
            }
            const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

            if (decoded.machineId !== currentMachineId) {
                return resolve({ success: false, message: "License key is not valid for this machine." });
            }

            db.run(\`INSERT INTO license (serial_key, activated_at, expires_at, machine_id) VALUES (?, ?, ?, ?)\`,
            [token, new Date().toISOString(), decoded.expiresAt, currentMachineId], function(err) {
                if (err) resolve({ success: false, message: "Database error." });
                else resolve({ success: true });
            });
        } catch (e) {
            resolve({ success: false, message: "Invalid or expired key." });
        }
    });
}
`;

if (!content.includes('function checkLicense()')) {
    content = content.replace('module.exports = {', licenseFunctions + '\nmodule.exports = {');
    fs.writeFileSync(filepath, content);
}
