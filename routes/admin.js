const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware to check if admin is logged in
const isAdmin = (req, res, next) => {
    if (req.session.role === 'admin') {
        return next();
    }
    res.status(403).json({ success: false, message: 'Forbidden: Admins only' });
};

// Get all appointments with user details
router.get('/appointments', isAdmin, (req, res) => {
    const query = `
        SELECT appointments.id, appointments.service, appointments.date, appointments.time, appointments.status, users.username 
        FROM appointments 
        JOIN users ON appointments.user_id = users.id
        ORDER BY appointments.date, appointments.time
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, appointments: rows });
    });
});

// Get admin dashboard statistics
router.get('/stats', isAdmin, (req, res) => {
    const stats = { total: 0, pending: 0, approved: 0, completed: 0, revenue: 0 };

    db.serialize(() => {
        db.get('SELECT COUNT(*) as count FROM appointments', [], (err, row) => {
            if (!err) stats.total = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM appointments WHERE status = 'pending'", [], (err, row) => {
            if (!err) stats.pending = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM appointments WHERE status = 'approved'", [], (err, row) => {
            if (!err) stats.approved = row.count;
        });
        db.get("SELECT COUNT(*) as count FROM appointments WHERE payment_status = 'paid'", [], (err, row) => {
            if (!err) stats.revenue = (row.count || 0) * 500;
            // Send after all queries in serialize() are done
            res.json({ success: true, ...stats });
        });
    });
});

// Admin delete any appointment
router.delete('/delete/:id', isAdmin, (req, res) => {
    const appointmentId = req.params.id;

    db.run('DELETE FROM appointments WHERE id = ?', [appointmentId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }
        res.json({ success: true, message: 'Appointment deleted successfully' });
    });
});

// Admin approve appointment
router.put('/approve/:id', isAdmin, (req, res) => {
    const appointmentId = req.params.id;

    db.run('UPDATE appointments SET status = "approved" WHERE id = ?', [appointmentId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        console.log(`Admin approved appointment ID: ${appointmentId}`);
        res.json({ success: true, message: 'Appointment approved successfully' });
    });
});

// Admin mark appointment as completed
router.put('/complete/:id', isAdmin, (req, res) => {
    const appointmentId = req.params.id;

    db.run('UPDATE appointments SET status = "completed" WHERE id = ?', [appointmentId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        console.log(`Admin completed appointment ID: ${appointmentId}`);
        res.json({ success: true, message: 'Appointment marked as completed' });
    });
});

module.exports = router;
