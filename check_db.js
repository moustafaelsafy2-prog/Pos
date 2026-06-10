const fs = require('fs');
let content = fs.readFileSync('src/main/db/database.js', 'utf8');

// The issue "screen freezes when typing password wrong and trying to delete" could be caused
// by bcrypt running synchronously on the main thread and blocking the Electron UI thread!
// bcrypt.compareSync is synchronous and CPU intensive. If called multiple times quickly (like on input? No, it's on click).
// But wait, the user said "If I write the password wrong and try to delete it and write it again, the screen freezes".
// If the UI is blocked during `bcrypt.compareSync` for a noticeable amount of time, it feels like a freeze.
// BUT `bcrypt.compareSync` shouldn't take more than ~100-300ms.
// Is `loginUser` throwing an unhandled error making the promise never resolve/reject?

// What if the user deletes the text while the promise is pending?
