const fs = require('fs');
let content = fs.readFileSync('src/renderer/license.js', 'utf8');

content = content.replace(
    '// Do not show app container yet, let login screen handle it',
    "// Do not show app container yet, let login screen handle it\n            document.getElementById('login-screen').style.display = 'flex';"
);

fs.writeFileSync('src/renderer/license.js', content, 'utf8');
