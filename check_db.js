const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'userData', 'database.sqlite'); // Need to find where the DB is actually created. Let's look at database.js first.
