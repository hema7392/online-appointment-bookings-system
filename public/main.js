// public/main.js

// Theme functionality
function initTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
}

// Execute immediately to prevent flash
initTheme();

// Utility functions for alerts
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alert-box');
    if (!alertBox) return;
    
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';

    setTimeout(() => hideAlert(), 4000);
}

function hideAlert() {
    const alertBox = document.getElementById('alert-box');
    if (alertBox) {
        alertBox.style.display = 'none';
    }
}

// Format Date and Time
function formatDateTime(dateStr, timeStr) {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateStr).toLocaleDateString(undefined, options);
    
    // Format time from 24h to 12h AM/PM
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const time = `${h}:${minutes} ${ampm}`;
    
    return `${date} at ${time}`;
}

// Authentication Check
async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        
        const path = window.location.pathname;
        const isAuthPage = path.includes('login.html');
        const isProtectedPage = path.includes('dashboard.html') || path.includes('book.html') || path.includes('payment.html');
        const isAdminPage = path.includes('admin.html');

        // Update Navigation
        const navLinks = document.getElementById('nav-links');
        const greeting = document.getElementById('user-greeting');

        if (data.authenticated) {
            if (isAuthPage) {
                // Redirect away from login if already logged in
                window.location.href = data.role === 'admin' ? '/admin.html' : '/dashboard.html';
                return;
            }

            if (navLinks && window.location.pathname === '/') {
                navLinks.innerHTML = `
                    <button id="theme-toggle" class="btn btn-outline" onclick="toggleTheme()" style="padding: 0.5rem; border-radius: 50%; border: none; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center;" title="Toggle Dark Mode">🌙</button>
                    <a href="${data.role === 'admin' ? '/admin.html' : '/dashboard.html'}" class="btn btn-outline">Dashboard</a>
                    <button onclick="handleLogout()" class="btn btn-danger">Logout</button>
                `;
            }

            if (greeting && data.username) {
                greeting.textContent = `Hello, ${data.username}`;
            }

            // Route protection
            if (isAdminPage && data.role !== 'admin') {
                window.location.href = '/dashboard.html';
            }
            if (isProtectedPage && data.role === 'admin') {
                window.location.href = '/admin.html';
            }

            // Modal Logic specific to Dashboard
            if (path.includes('dashboard.html')) {
                if (sessionStorage.getItem('showEmailModal') === 'true') {
                    sessionStorage.removeItem('showEmailModal');
                    const modal = document.getElementById('email-modal');
                    if (modal) {
                        modal.classList.add('show');
                        setTimeout(() => {
                            modal.classList.remove('show');
                        }, 3000);
                    }
                }
            }

        } else {
            if (isProtectedPage || isAdminPage) {
                window.location.href = '/login.html';
            }
        }
    } catch (err) {
        console.error('Auth check error', err);
    }
}

// Auth Handlers
async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            showAlert(data.message, 'success');
            setTimeout(() => switchTab('login'), 2000);
            e.target.reset();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Server error occurred', 'error');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            window.location.href = data.redirect;
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Server error occurred', 'error');
    }
}

async function handleLogout() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            window.location.href = data.redirect;
        }
    } catch (err) {
        console.error('Logout error', err);
    }
}

// User Appointment Handlers & Filters
let allAppointments = [];

async function loadAppointments() {
    try {
        const res = await fetch('/api/appointments');
        const data = await res.json();

        if (res.ok) {
            allAppointments = data.appointments;
            renderAppointments(allAppointments);
        }
    } catch (err) {
        console.error('Failed to load appointments', err);
    }
}

function filterAppointments() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase();
    const dateFilter = document.getElementById('date-filter').value;
    
    // Create Date String format "YYYY-MM-DD" matching DB date format
    const today = new Date();
    // Accounting for local timezone
    const offset = today.getTimezoneOffset();
    const todayDate = new Date(today.getTime() - (offset*60*1000));
    const todayStr = todayDate.toISOString().split('T')[0];

    const filtered = allAppointments.filter(app => {
        // Match Search Query
        const matchSearch = app.service.toLowerCase().includes(searchQuery) || app.date.includes(searchQuery);
        
        // Match Date Range
        let matchDate = true;
        if (dateFilter === 'today') {
            matchDate = app.date === todayStr;
        } else if (dateFilter === 'upcoming') {
            matchDate = app.date > todayStr;
        } else if (dateFilter === 'past') {
            matchDate = app.date < todayStr;
        }
        
        return matchSearch && matchDate;
    });

    renderAppointments(filtered);
}

function renderAppointments(appointmentsToRender) {
    const grid = document.getElementById('appointments-grid');
    const noAppt = document.getElementById('no-appointments');
    
    if (!grid || !noAppt) return;
    
    grid.innerHTML = '';
    
    if (appointmentsToRender.length === 0) {
        grid.style.display = 'none';
        noAppt.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noAppt.style.display = 'none';

    appointmentsToRender.forEach(app => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <h3>${app.service}</h3>
                <span class="badge badge-${app.status}">${app.status}</span>
            </div>
            <p><strong>Date & Time:</strong><br>${formatDateTime(app.date, app.time)}</p>
            <div class="card-actions">
                <button onclick="deleteAppointment(${app.id})" class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.9em;">Cancel Appointment</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function handleBooking(e) {
    e.preventDefault();
    const service = document.getElementById('service').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    // Save pending form to complete payment next
    sessionStorage.setItem('pendingBooking', JSON.stringify({ service, date, time }));
    window.location.href = '/payment.html';
}

async function handlePayment(e) {
    e.preventDefault();
    const btn = document.getElementById('pay-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    // Simulate 1.5s network payment latency
    setTimeout(async () => {
        try {
            const bookingData = JSON.parse(sessionStorage.getItem('pendingBooking'));
            if (!bookingData) throw new Error('No booking payload mapped.');

            const payload = {
                ...bookingData,
                payment_status: 'paid'
            };

            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (res.ok) {
                showAlert('Payment Successful!', 'success');
                sessionStorage.removeItem('pendingBooking');
                sessionStorage.setItem('showEmailModal', 'true'); // Flag to render Confimation Modal
                
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1000);
            } else {
                showAlert(data.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Pay Now & Confirm Booking';
            }
        } catch (err) {
            showAlert('Payment failed securely. Try again.', 'error');
            btn.disabled = false;
            btn.textContent = 'Pay Now & Confirm Booking';
        }
    }, 1500);
}

async function deleteAppointment(id) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    try {
        const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.ok) {
            showAlert(data.message, 'success');
            loadAppointments();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Failed to cancel appointment', 'error');
    }
}

// Admin Appointment Handlers
async function loadAdminAppointments() {
    try {
        const res = await fetch('/api/admin/appointments');
        const data = await res.json();

        if (res.ok) {
            const grid = document.getElementById('admin-appointments-grid');
            const noAppt = document.getElementById('no-appointments');
            
            grid.innerHTML = '';
            
            if (data.appointments.length === 0) {
                grid.style.display = 'none';
                noAppt.style.display = 'block';
                return;
            }

            grid.style.display = 'grid';
            noAppt.style.display = 'none';

            data.appointments.forEach(app => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3>${app.service}</h3>
                        <div>
                            <span class="badge badge-${app.status}" style="margin-right: 0.5rem;">${app.status}</span>
                            <span style="background: var(--card-bg); border: 1px solid var(--text-muted); color: var(--text); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">User: ${app.username}</span>
                        </div>
                    </div>
                    <p><strong>Date & Time:</strong><br>${formatDateTime(app.date, app.time)}</p>
                    <div class="card-actions" style="gap: 0.5rem;">
                        ${app.status === 'pending' ? `<button onclick="approveAppointment(${app.id})" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.9em;">Approve</button>` : ''}
                        ${app.status === 'approved' ? `<button onclick="completeAppointment(${app.id})" class="btn btn-primary" style="padding: 0.4rem 1rem; font-size: 0.9em;">Mark Completed</button>` : ''}
                        <button onclick="deleteAdminAppointment(${app.id})" class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.9em;">Delete</button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (err) {
        console.error('Failed to load admin appointments', err);
    }
}

async function deleteAdminAppointment(id) {
    if (!confirm("Are you sure you want to delete this user's appointment?")) return;

    try {
        const res = await fetch(`/api/admin/delete/${id}`, { method: 'DELETE' });
        const data = await res.json();

        if (res.ok) {
            showAlert(data.message, 'success');
            loadAdminAppointments();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Failed to delete appointment', 'error');
    }
}

async function approveAppointment(id) {
    if (!confirm("Are you sure you want to approve this appointment?")) return;
    try {
        const res = await fetch(`/api/admin/approve/${id}`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            showAlert(data.message, 'success');
            loadAdminAppointments();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Failed to approve appointment', 'error');
    }
}

async function completeAppointment(id) {
    if (!confirm("Are you sure you want to mark this appointment as completed?")) return;
    try {
        const res = await fetch(`/api/admin/complete/${id}`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            showAlert(data.message, 'success');
            loadAdminAppointments();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (err) {
        showAlert('Failed to complete appointment', 'error');
    }
}
