const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.status(401).json({ success: false, message: 'Unauthorized' });
};

// Book an appointment (normal flow → status: pending, payment: unpaid)
router.post('/', isAuthenticated, (req, res) => {
    const { service, date, time } = req.body;
    const userId = req.session.userId;

    if (!service || !date || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    db.run(
        `INSERT INTO appointments (user_id, service, date, time, status, payment_status)
         VALUES (?, ?, ?, ?, 'pending', 'unpaid')`,
        [userId, service, date, time],
        function(err) {
            if (err) {
                console.error('DB Error on POST /:', err.message);
                return res.status(500).json({ success: false, message: 'Database save failed' });
            }
            res.json({ success: true, message: 'Appointment booked successfully!' });
        }
    );
});

// Confirm appointment after payment (used by payment.html)
router.post('/confirm', isAuthenticated, (req, res) => {
    const { service, date, time } = req.body;
    const userId = req.session.userId;
    const username = req.session.username;

    if (!service || !date || !time) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    db.run(
        `INSERT INTO appointments (user_id, service, date, time, status, payment_status)
         VALUES (?, ?, ?, ?, 'approved', 'paid')`,
        [userId, service, date, time],
        function(err) {
            if (err) {
                console.error('DB Error on /confirm:', err.message);
                return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
            }
            console.log(`Appointment confirmed for user: ${username} | Service: ${service} | Date: ${date} ${time}`);
            res.json({ success: true, message: 'Booking Confirmed Successfully' });
        }
    );
});

// Get user's appointments
router.get('/', isAuthenticated, (req, res) => {
    const userId = req.session.userId;

    db.all('SELECT * FROM appointments WHERE user_id = ? ORDER BY date, time', [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, appointments: rows });
    });
});

// Delete own appointment
router.delete('/:id', isAuthenticated, (req, res) => {
    const userId = req.session.userId;
    const appointmentId = req.params.id;

    db.run('DELETE FROM appointments WHERE id = ? AND user_id = ?', [appointmentId, userId], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found or not authorized' });
        }
        res.json({ success: true, message: 'Appointment deleted successfully' });
    });
});

module.exports = router;

