const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Initialize SQLite database
const db = new sqlite3.Database('users.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        return;
    }
    console.log('Connected to SQLite database');

    // Create users table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        party TEXT NOT NULL,
        portrait TEXT,
        biography TEXT,
        isAdmin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, async (err) => {
        if (err) {
            console.error('Error creating users table:', err);
            return;
        }

        // Check if admin account exists
        db.get('SELECT * FROM users WHERE email = ?', ['admin@vchouse.gov'], async (err, admin) => {
            if (err) {
                console.error('Error checking admin account:', err);
                return;
            }

            if (!admin) {
                // Create admin account
                const hashedPassword = await bcrypt.hash('admin123', 10);
                db.run(
                    'INSERT INTO users (fullName, email, password, party, isAdmin) VALUES (?, ?, ?, ?, ?)',
                    ['Admin', 'admin@vchouse.gov', hashedPassword, 'Democrat', 1],
                    function(err) {
                        if (err) {
                            console.error('Error creating admin account:', err);
                        } else {
                            console.log('Admin account created successfully');
                            updateRepresentatives();
                        }
                    }
                );
            } else {
                console.log('Admin account already exists');
                updateRepresentatives();
            }
        });
    });
});

function updateRepresentatives() {
    const representativesPath = path.join(__dirname, 'representatives_new.json');
    try {
        let representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
        // Set Diana Catherine Allar as the representative for UT-3
        representativesData['UT-3'] = 'Diana Catherine Allar (D)';
        fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));
        console.log('UT-3 updated with Diana Catherine Allar');
    } catch (error) {
        console.error('Error updating representatives file:', error);
    }
    db.close();
} 