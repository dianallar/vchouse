const express = require('express');
const cors = require('cors');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();

// Add CORS configuration before other middleware
app.use(cors({
    origin: 'https://dianallar.github.io',
    credentials: true
}));

// Update storage configuration for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'Portraits/');
    },
    filename: function (req, file, cb) {
        cb(null, `temp_${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

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
    }
});

// Add this to your database initialization section
db.serialize(() => {
    // Ensure users table has biography column
    db.run(`
        ALTER TABLE users ADD COLUMN biography TEXT;
    `, (err) => {
        // Ignore error if column already exists
        console.log('Biography column check complete');
    });
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

app.get('/api/get-biography', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Getting biography for user:', req.session.userId);

    db.get('SELECT biography FROM users WHERE id = ?', [req.session.userId], (err, row) => {
        if (err) {
            console.error('Database error fetching biography:', err);
            return res.status(500).json({ message: 'Error fetching biography' });
        }

        console.log('Biography data:', row);
        res.json({ biography: row ? row.biography : null });
    });
});

app.post('/api/save-biography', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { biography } = req.body;
    console.log('Saving biography for user:', req.session.userId, 'Biography:', biography);

    db.run(
        'UPDATE users SET biography = ? WHERE id = ?',
        [biography, req.session.userId],
        function(err) {
            if (err) {
                console.error('Error saving biography:', err);
                return res.status(500).json({ message: 'Error saving biography' });
            }
            console.log('Biography saved successfully');
            res.json({ message: 'Biography saved successfully' });
        }
    );
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
    
    // Get user's district
    db.get('SELECT district FROM representatives WHERE userId = ?', 
        [req.session.userId], 
        (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!row) {
                return res.status(404).json({ message: 'No district found' });
            }

            // Update biography in representatives table
            db.run('UPDATE representatives SET biography = ? WHERE userId = ?',
                [biography, req.session.userId],
                (err) => {
                    if (err) {
                        console.error('Error saving biography:', err);
                        return res.status(500).json({ message: 'Failed to save biography' });
                    }
                    res.json({ message: 'Biography updated successfully' });
                }
            );
        }
    );
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

// Update the portrait upload endpoint
app.post('/api/update-portrait', (req, res) => {
    upload.single('portrait')(req, res, function(err) {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Use the districtKey sent from the client
        const districtKey = req.body.districtKey;
        if (!districtKey) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: 'No district key provided' });
        }

        try {
            // Rename file to district key
            const newPath = path.join(__dirname, 'Portraits', `${districtKey}.jpg`);
            fs.renameSync(req.file.path, newPath);

            res.json({
                success: true,
                filename: `${districtKey}.jpg`,
                message: 'Portrait updated successfully'
            });
        } catch (error) {
            if (req.file) {
                fs.unlink(req.file.path, () => {});
            }
            console.error('Error processing portrait:', error);
            res.status(500).json({ message: 'Failed to process portrait upload' });
        }
    });
});

app.post('/api/register', async (req, res) => {
    const { fullName, email, password, party } = req.body;

    try {
        // Check if user already exists
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (user) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            db.run(
                'INSERT INTO users (fullName, email, password, party) VALUES (?, ?, ?, ?)',
                [fullName, email, hashedPassword, party],
                function(err) {
                    if (err) {
                        console.error('Error creating user:', err);
                        return res.status(500).json({ message: 'Error creating account' });
                    }

                    res.status(201).json({ 
                        message: 'Registration successful',
                        userId: this.lastID 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
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

// Add this endpoint after your other API routes
app.post('/api/unclaim-district', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const { state, district } = req.body;
    const districtKey = `${state}-${district}`;

    try {
        // First verify the user owns this district
        const representativesPath = path.join(__dirname, 'representatives_new.json');
        const representativesData = JSON.parse(fs.readFileSync(representativesPath, 'utf8'));

        // Get user info
        db.get('SELECT fullName FROM users WHERE id = ?', [req.session.userId], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Check if user owns this district
            const currentRep = representativesData[districtKey];
            if (!currentRep || !currentRep.startsWith(user.fullName)) {
                return res.status(403).json({ message: 'You do not own this district' });
            }

            // Update representatives data
            representativesData[districtKey] = 'N/A';
            fs.writeFileSync(representativesPath, JSON.stringify(representativesData, null, 2));

            // Delete portrait if it exists
            const portraitPath = path.join(__dirname, 'Portraits', `${districtKey}.jpg`);
            if (fs.existsSync(portraitPath)) {
                fs.unlink(portraitPath, (err) => {
                    if (err) console.error('Error deleting portrait:', err);
                });
            }

            res.json({ 
                success: true,
                message: 'District unclaimed successfully'
            });
        });
    } catch (error) {
        console.error('Error in unclaim district:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add this route before your static file serving
app.get('/api/get-district-biography/:districtKey', (req, res) => {
    const districtKey = req.params.districtKey;
    
    // Get the biography from representatives data
    db.get(
        'SELECT biography FROM representatives WHERE district = ?',
        [districtKey],
        (err, row) => {
            if (err) {
                console.error('Error fetching district biography:', err);
                return res.status(500).json({ message: 'Error fetching biography' });
            }

            res.json({
                biography: row?.biography || null
            });
        }
    );
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