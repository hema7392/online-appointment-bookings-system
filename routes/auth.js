const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../database');

// Signup
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ success: false, message: 'Username already exists' });
                }
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, message: 'Signup successful! You can now login.' });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Hardcoded Admin Login
    if (username === 'admin' && password === 'admin123') {
        req.session.role = 'admin';
        return res.json({ success: true, role: 'admin', message: 'Admin login successful', redirect: '/admin.html' });
    }

    // Regular User Login
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ success: true, role: 'user', message: 'Login successful', redirect: '/dashboard.html' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
    });
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully', redirect: '/login.html' });
    });
});

// Check auth status
router.get('/status', (req, res) => {
    if (req.session.role === 'admin') {
        res.json({ authenticated: true, role: 'admin', username: 'admin' });
    } else if (req.session.userId) {
        res.json({ authenticated: true, role: 'user', username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
