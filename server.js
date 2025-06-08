const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const app = express();

// Initialize SQLite database
const db = new sqlite3.Database('database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            party TEXT,
            isAdmin INTEGER DEFAULT 0,
            portrait TEXT,
            biography TEXT,
            location TEXT,
            website TEXT
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err);
            } else {
                console.log('Users table ready');
                // Create admin account if it doesn't exist
                const adminEmail = 'admin@example.com';
                const adminPassword = 'admin123';
                const hashedPassword = bcrypt.hashSync(adminPassword, 10);

                db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, user) => {
                    if (err) {
                        console.error('Error checking admin account:', err);
                    } else if (!user) {
                        db.run('INSERT INTO users (fullName, email, password, party, isAdmin) VALUES (?, ?, ?, ?, ?)',
                            ['Admin User', adminEmail, hashedPassword, 'Independent', 1],
                            function(err) {
                                if (err) {
                                    console.error('Error creating admin account:', err);
                                } else {
                                    console.log('Admin account created successfully');
                                    // Attach UT-3 to admin account
                                    db.run('UPDATE representatives SET userId = ? WHERE district = ?',
                                        [this.lastID, 'UT-3'],
                                        (err) => {
                                            if (err) {
                                                console.error('Error attaching UT-3 to admin:', err);
                                            } else {
                                                console.log('UT-3 attached to admin account');
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                });
            }
        });
        
        // Create new users table with all required columns
        db.run(`CREATE TABLE IF NOT EXISTS users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            party TEXT NOT NULL,
            portrait TEXT,
            biography TEXT,
            location TEXT,
            website TEXT,
            isAdmin BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, async (err) => {
            if (err) {
                console.error('Error creating new users table:', err);
            } else {
                // Check if old table exists
                db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, result) => {
                    if (err) {
                        console.error('Error checking old table:', err);
                        return;
                    }

                    if (result) {
                        // Migrate data from old table to new table
                        db.run(`INSERT INTO users_new (id, fullName, email, password, party, isAdmin, created_at)
                                SELECT id, fullName, email, password, party, isAdmin, created_at FROM users`, (err) => {
                            if (err) {
                                console.error('Error migrating data:', err);
                            } else {
                                // Drop old table
                                db.run('DROP TABLE users', (err) => {
                                    if (err) {
                                        console.error('Error dropping old table:', err);
                                    } else {
                                        // Rename new table to users
                                        db.run('ALTER TABLE users_new RENAME TO users', (err) => {
                                            if (err) {
                                                console.error('Error renaming table:', err);
                                            } else {
                                                console.log('Database schema updated successfully');
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'Portraits/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware
app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// API Routes
app.get('/api/auth-status', (req, res) => {
    if (req.session.userId) {
        db.get('SELECT id, fullName, email, party, isAdmin FROM users WHERE id = ?', 
            [req.session.userId], 
            (err, user) => {
                if (err) {
                    console.error('Auth status error:', err);
                    return res.status(500).json({ message: 'Error checking auth status' });
                }
                if (user) {
                    // Add optional fields with default values
                    user.portrait = null;
                    user.biography = '';
                    user.location = '';
                    user.website = '';
                    res.json({ user });
                } else {
                    res.json({ user: null });
                }
            });
    } else {
        res.json({ user: null });
    }
});

app.get('/api/get-biography', (req, res) => {
    console.log('=== GET BIOGRAPHY REQUEST START ===');
    console.log('Request path:', req.path);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    console.log('Session:', req.session);
    console.log('Session ID:', req.session.id);
    console.log('User ID:', req.session.userId);
    
    if (!req.session.userId) {
        console.log('No user ID in session, returning 401');
        return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Querying database for user ID:', req.session.userId);
    db.get('SELECT biography FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error getting biography:', err);
            return res.status(500).json({ message: 'Error getting biography' });
        }
        console.log('Database response:', user);
        
        // Clean the biography text
        let cleanBiography = '';
        if (user?.biography) {
            // Remove style attributes and unwanted formatting
            cleanBiography = user.biography
                .replace(/style="[^"]*"/g, '') // Remove style attributes
                .replace(/face="[^"]*"/g, '') // Remove face attributes
                .replace(/color="[^"]*"/g, '') // Remove color attributes
                .replace(/<font[^>]*>/g, '') // Remove font tags
                .replace(/<\/font>/g, '') // Remove closing font tags
                .replace(/<span[^>]*>/g, '') // Remove span tags
                .replace(/<\/span>/g, '') // Remove closing span tags
                .replace(/<div[^>]*>/g, '') // Remove div tags
                .replace(/<\/div>/g, '') // Remove closing div tags
                .replace(/<br\s*\/?>/g, '\n') // Convert br tags to newlines
                .replace(/\n\s*\n/g, '\n') // Remove multiple consecutive newlines
                .trim();
        }
        
        res.json({ biography: cleanBiography });
        console.log('=== GET BIOGRAPHY REQUEST END ===');
    });
});

app.post('/api/update-biography', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { biography } = req.body;
    if (!biography) {
        return res.status(400).json({ message: 'Biography is required' });
    }
    
    // First get the user's full name and party
    db.get('SELECT fullName, party FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error getting user:', err);
            return res.status(500).json({ message: 'Failed to update biography' });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update the biography in the users table
        db.run('UPDATE users SET biography = ? WHERE id = ?', 
            [biography, req.session.userId],
            function(err) {
                if (err) {
                    console.error('Error updating biography:', err);
                    return res.status(500).json({ message: 'Failed to update biography' });
                }

                // Update the representatives data
                const representativesPath = path.join(__dirname, 'representatives_new.json');
                try {
                    const representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
                    
                    // Find the district claimed by this user
                    const claimedDistrict = Object.entries(representativesData).find(([_, value]) => 
                        value && value.startsWith(user.fullName)
                    );

                    if (claimedDistrict) {
                        // Update the biography in the district data
                        const [districtKey] = claimedDistrict;
                        representativesData[districtKey] = `${user.fullName} (${user.party.charAt(0)})`;
                        fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));
                    }

                    res.json({ success: true });
                } catch (error) {
                    console.error('Error updating representatives data:', error);
                    res.status(500).json({ message: 'Failed to update biography' });
                }
            }
        );
    });
});

app.get('/api/claimed-district', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get user info first
    db.get('SELECT fullName FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err) {
            console.error('Error getting user:', err);
            return res.status(500).json({ message: 'Error checking claimed district' });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Read the representatives data
        const representativesPath = path.join(__dirname, 'representatives_new.json');
        try {
            const representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
            
            // Find the district claimed by this user
            const claimedDistrict = Object.entries(representativesData).find(([_, value]) => {
                if (!value || value === "N/A") return false;
                const [name] = value.split(' (');
                return name === user.fullName;
            });

            if (claimedDistrict) {
                res.json({ district: claimedDistrict[0] });
            } else {
                res.json({ district: null });
            }
        } catch (error) {
            console.error('Error reading representatives data:', error);
            res.status(500).json({ message: 'Error checking claimed district' });
        }
    });
});

app.post('/api/update-profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { fullName, biography, location, website } = req.body;
    
    // First get the old name to update the representatives data
    db.get('SELECT fullName FROM users WHERE id = ?', [req.session.userId], (err, oldUser) => {
        if (err) {
            console.error('Error getting old user data:', err);
            return res.status(500).json({ message: 'Failed to update profile' });
        }

        // Update the user's profile
        db.run(
            'UPDATE users SET fullName = ?, biography = ?, location = ?, website = ? WHERE id = ?',
            [fullName, biography, location, website, req.session.userId],
            function(err) {
                if (err) {
                    console.error('Error updating profile:', err);
                    return res.status(500).json({ message: 'Failed to update profile' });
                }

                // Update the representatives data if the name changed
                if (oldUser && oldUser.fullName !== fullName) {
                    const representativesPath = path.join(__dirname, 'representatives_new.json');
                    try {
                        const representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
                        
                        // Find and update the district entry
                        Object.entries(representativesData).forEach(([key, value]) => {
                            if (value && value.startsWith(oldUser.fullName)) {
                                const [_, party] = value.split(' (');
                                representativesData[key] = `${fullName} (${party}`;
                            }
                        });

                        fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));
                    } catch (error) {
                        console.error('Error updating representatives data:', error);
                    }
                }

                res.json({ success: true });
            }
        );
    });
});

app.post('/api/update-portrait', upload.single('portrait'), (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    db.run(
        'UPDATE users SET portrait = ? WHERE id = ?',
        [req.file.filename, req.session.userId],
        function(err) {
            if (err) {
                console.error('Error updating portrait:', err);
                return res.status(500).json({ message: 'Failed to update portrait' });
            }
            res.json({ success: true, filename: req.file.filename });
        }
    );
});

app.post('/api/register', upload.single('portrait'), async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { fullName, email, password, party } = req.body;
        const portraitFile = req.file;

        if (!fullName || !email || !password || !party || !portraitFile) {
            console.log('Missing required fields:', { fullName, email, party, portraitFile });
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if email already exists
        db.get('SELECT email FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Registration failed' });
            }

            if (row) {
                console.log('Email already registered:', email);
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run(
                'INSERT INTO users (fullName, email, password, party, portrait) VALUES (?, ?, ?, ?, ?)',
                [fullName, email, hashedPassword, party, portraitFile.filename],
                function(err) {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({ message: 'Registration failed' });
                    }
                    console.log('User registered successfully:', email);
                    res.status(201).json({ message: 'Registration successful' });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Registration failed' });
    }
});

app.post('/api/login', (req, res) => {
    console.log('=== LOGIN REQUEST START ===');
    console.log('Request body:', req.body);
    console.log('Session before login:', req.session);
    
    const { email, password } = req.body;

    if (!email || !password) {
        console.log('Missing credentials:', { email: !!email, password: !!password });
        return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Checking database for user:', email);
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ message: 'Login failed' });
        }

        if (!user) {
            console.log('User not found in database:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('User found, comparing passwords');
        try {
            const match = await bcrypt.compare(password, user.password);
            console.log('Password match result:', match);
            
            if (!match) {
                console.log('Password mismatch for user:', email);
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            console.log('Login successful, setting session');
            req.session.userId = user.id;
            console.log('Session after login:', req.session);
            
            const responseData = { 
                success: true, 
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    party: user.party,
                    portrait: user.portrait,
                    isAdmin: user.isAdmin
                }
            };
            console.log('Sending response:', responseData);
            res.json(responseData);
            console.log('=== LOGIN REQUEST END ===');
        } catch (error) {
            console.error('Error during password comparison:', error);
            res.status(500).json({ message: 'Login failed' });
        }
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.post('/api/claim-district', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { state, district } = req.body;
    if (!state || !district) {
        return res.status(400).json({ message: 'State and district are required' });
    }

    const districtKey = `${state}-${district}`;
    const representativesPath = path.join(__dirname, 'representatives_new.json');

    try {
        // Read current representatives data
        let representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));

        // Check if district is already claimed
        if (representativesData[districtKey] && representativesData[districtKey] !== "N/A") {
            return res.status(400).json({ message: 'District is already claimed' });
        }

        // Get user info
        db.get('SELECT fullName, party FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err) {
                console.error('Error getting user info:', err);
                return res.status(500).json({ message: 'Failed to claim district' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Update representatives data
            representativesData[districtKey] = `${user.fullName} (${user.party.charAt(0)})`;
            fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));

            res.json({ 
                success: true, 
                message: 'District claimed successfully',
                representative: representativesData[districtKey]
            });
        });
    } catch (error) {
        console.error('Error claiming district:', error);
        res.status(500).json({ message: 'Failed to claim district' });
    }
});

// Admin: Get all districts endpoint
app.get('/api/admin/districts', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is admin
    db.get('SELECT isAdmin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const representativesPath = path.join(__dirname, 'representatives_new.json');
        try {
            const representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
            res.json({ districts: representativesData });
        } catch (error) {
            console.error('Error reading representatives data:', error);
            res.status(500).json({ message: 'Error fetching districts' });
        }
    });
});

// Admin: Update district endpoint
app.post('/api/admin/update-district', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is admin
    db.get('SELECT isAdmin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { districtKey, representative } = req.body;
        if (!districtKey || !representative) {
            return res.status(400).json({ message: 'District key and representative are required' });
        }

        const representativesPath = path.join(__dirname, 'representatives_new.json');
        try {
            let representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));
            representativesData[districtKey] = representative;
            fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating district:', error);
            res.status(500).json({ message: 'Error updating district' });
        }
    });
});

// Admin: Get all users endpoint
app.get('/api/admin/users', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is admin
    db.get('SELECT isAdmin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        db.all('SELECT id, fullName, email, party, isAdmin, created_at FROM users', [], (err, users) => {
            if (err) {
                return res.status(500).json({ message: 'Error fetching users' });
            }
            res.json({ users });
        });
    });
});

// Admin: Update user endpoint
app.post('/api/admin/update-user', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    // Check if user is admin
    db.get('SELECT isAdmin FROM users WHERE id = ?', [req.session.userId], (err, user) => {
        if (err || !user || !user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { userId, fullName, party, isAdmin } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        db.run(
            'UPDATE users SET fullName = ?, party = ?, isAdmin = ? WHERE id = ?',
            [fullName, party, isAdmin ? 1 : 0, userId],
            function(err) {
                if (err) {
                    return res.status(500).json({ message: 'Error updating user' });
                }
                res.json({ success: true });
            }
        );
    });
});

// Static file serving - moved after API routes
app.use(express.static(__dirname));
app.use('/Portraits', express.static(path.join(__dirname, 'Portraits'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.svg')) {
            res.set('Content-Type', 'image/svg+xml');
        }
    }
}));

// Ensure Portraits directory exists
const portraitsDir = path.join(__dirname, 'Portraits');
if (!fs.existsSync(portraitsDir)) {
    fs.mkdirSync(portraitsDir);
}

// Copy default profile picture if it doesn't exist
const defaultPfpPath = path.join(portraitsDir, 'default.svg');
if (!fs.existsSync(defaultPfpPath)) {
    fs.copyFileSync(path.join(__dirname, 'Portraits', 'default.svg'), defaultPfpPath);
}

// Add route handler for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'VCHouse2.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 