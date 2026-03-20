const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware - session MUST be before routes so req.session is populated
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Setup session BEFORE routes and static files
app.use(session({
    secret: 'secret-key-appointment-booking',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// API Routes (must come before static middleware to avoid interception)
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

// Protect admin.html page from direct access without admin session
app.get('/admin.html', (req, res, next) => {
    if (req.session.role === 'admin') {
        next();
    } else {
        res.redirect('/login.html');
    }
});

// Protect user pages from direct access without user session
const protectedPages = ['/dashboard.html', '/book.html', '/payment.html'];
app.use(protectedPages, (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
});

// Serve static files (public folder) - after routes
app.use(express.static(path.join(__dirname, 'public')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("Server started on port", PORT);
});
