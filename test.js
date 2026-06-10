const fs = require('fs');

const htmlFile = 'src/renderer/index.html';
let html = fs.readFileSync(htmlFile, 'utf8');

// There is no form, just inputs.
// Freezing in ANY input field when deleting/retyping sounds like:
// 1. A global keydown listener is throwing an unhandled exception.
// 2. An input event listener is throwing an unhandled exception.
// 3. Or simply `alert()` is being called rapidly and freezing Electron?
// 4. In license.js we have a global keydown for Ctrl+Shift+L. Let's look at it.
