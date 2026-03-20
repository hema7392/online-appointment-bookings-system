const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Run table creation and migrations in series using db.serialize
    db.serialize(() => {

        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) console.error('Error creating users table:', err.message);
        });

        // Create appointments table with full schema
        db.run(`CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            service TEXT,
            date TEXT,
            time TEXT,
            status TEXT DEFAULT 'pending',
            payment_status TEXT DEFAULT 'unpaid',
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('Error creating appointments table:', err.message);
            else {
                // Run migrations after table is confirmed to exist
                runMigrations();
            }
        });
    });
}

function runMigrations() {
    // Safely add 'status' column if it doesn't exist
    db.run(`ALTER TABLE appointments ADD COLUMN status TEXT DEFAULT 'pending'`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                // Column already exists — this is expected on fresh installs
            } else {
                console.error('Migration error (status):', err.message);
            }
        } else {
            console.log("Migration applied: added 'status' column to appointments.");
        }
    });

    // Safely add 'payment_status' column if it doesn't exist
    db.run(`ALTER TABLE appointments ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                // Column already exists — this is expected on fresh installs
            } else {
                console.error('Migration error (payment_status):', err.message);
            }
        } else {
            console.log("Migration applied: added 'payment_status' column to appointments.");
        }
    });
}

module.exports = db;
