/**
 * Authentication Module
 * Handles login and authentication state with enhanced security
 */

const CONFIG = {
    API_BASE_URL: 'http://localhost:3000'
};

// Security configuration
const SECURITY_CONFIG = {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_TIME: 10 * 60 * 1000 // 10 minutes
};

// Initialize DOMPurify if available
const DOMPurify = window.DOMPurify || {
    sanitize: (html) => html.replace(/[<>]/g, '') // Fallback sanitizer
};

/**
 * ==========================================
 * RATIO SCALE QUANTITATIVE THREAT METRICS
 * ==========================================
 * Number of failed login attempts: 0, 1, 2, ..., n
 * True zero exists: 0 = no failed attempts
 * Meaningful operations: count, rate, average
 */
class FailedAttemptsMetric {
    constructor() {
        this.storageKey = 'threatMetrics_failedAttempts';
        this.initializeMetrics();
    }

    initializeMetrics() {
        const existing = localStorage.getItem(this.storageKey);
        if (!existing) {
            localStorage.setItem(this.storageKey, JSON.stringify({
                totalAttempts: 0,
                uniqueUsers: 0,
                history: []
            }));
        }
    }

    /**
     * Record a failed login attempt as a ratio scale metric
     * @param {string} email - User email (for tracking unique users)
     * @returns {number} - Total count of failed attempts (n >= 0)
     */
    recordFailedAttempt(email) {
        const metrics = JSON.parse(localStorage.getItem(this.storageKey));
        metrics.totalAttempts += 1;

        // Track unique users
        const existingUser = metrics.history.find(h => h.email === email);
        if (!existingUser) {
            metrics.uniqueUsers += 1;
        }

        // Add to history for analytics
        metrics.history.push({
            email,
            timestamp: Date.now(),
            attemptNumber: metrics.totalAttempts
        });

        // Keep only last 1000 records for performance
        if (metrics.history.length > 1000) {
            metrics.history = metrics.history.slice(-1000);
        }

        localStorage.setItem(this.storageKey, JSON.stringify(metrics));
        return metrics.totalAttempts;
    }

    /**
     * Get ratio scale metrics for failed attempts
     * @returns {object} - Metrics object with ratio scale values
     */
    getMetrics() {
        const metrics = JSON.parse(localStorage.getItem(this.storageKey));
        return {
            totalFailedAttempts: metrics.totalAttempts,  // Count: 0, 1, 2, ..., n
            uniqueUsersLocked: metrics.uniqueUsers,
            failureRate: metrics.totalAttempts > 0 ? (metrics.totalAttempts / Math.max(1, metrics.history.length)) : 0,
            lastAttempt: metrics.history.length > 0 ? metrics.history[metrics.history.length - 1].timestamp : null
        };
    }

    /**
     * Get user-specific ratio scale metric
     * @param {string} email - User email
     * @returns {number} - User's failed attempt count (0, 1, 2, ..., n)
     */
    getUserAttemptCount(email) {
        const userData = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
        return userData[email]?.count || 0;
    }

    /**
     * Get all users by failed attempt count (ratio scale ranking)
     * @returns {array} - Users ranked by attempt count
     */
    getUsersByAttemptCount() {
        const userAttempts = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
        return Object.entries(userAttempts)
            .map(([email, data]) => ({
                email,
                attemptCount: data.count,  // Ratio scale value
                lastAttempt: data.lastAttempt
            }))
            .sort((a, b) => b.attemptCount - a.attemptCount);
    }

    /**
     * Generate analytics report on failed attempts metric
     * @returns {object} - Analytics report
     */
    generateReport() {
        const metrics = JSON.parse(localStorage.getItem(this.storageKey));
        const usersList = this.getUsersByAttemptCount();

        return {
            reportTime: new Date().toISOString(),
            ratioScaleMetric: {
                name: 'Number of failed login attempts',
                type: 'Ratio Scale (Quantitative)',
                hasZero: true,
                values: 'n >= 0 (0, 1, 2, ..., n)',
                unit: 'count'
            },
            summary: {
                totalFailedAttempts: metrics.totalAttempts,
                uniqueUsersWithFailures: metrics.uniqueUsers,
                topOffenders: usersList.slice(0, 5)
            },
            analytics: this.getMetrics()
        };
    }

    /**
     * Export metrics as CSV for security analysis
     * @returns {string} - CSV formatted metrics
     */
    exportAsCSV() {
        const report = this.generateReport();
        let csv = 'Failed Login Attempts Metric Report\n';
        csv += 'Generated: ' + report.reportTime + '\n\n';
        csv += 'Email,Failed Attempts Count,Last Attempt\n';

        report.summary.topOffenders.forEach(user => {
            csv += `"${user.email}",${user.attemptCount},${new Date(user.lastAttempt).toISOString()}\n`;
        });

        csv += '\n\nMetric Summary\n';
        csv += `Total Failed Attempts,${report.summary.totalFailedAttempts}\n`;
        csv += `Unique Users Locked,${report.summary.uniqueUsersWithFailures}\n`;

        return csv;
    }
}

// Initialize failed attempts metric tracker
const failedAttemptsMetric = new FailedAttemptsMetric();

// Failed Attempts Storage (with ratio scale metric tracking)
function getFailedAttempts(email) {
    const data = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
    return data[email] || { count: 0, lastAttempt: 0 };
}

function setFailedAttempts(email, count) {
    const data = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
    data[email] = {
        count,
        lastAttempt: Date.now()
    };
    localStorage.setItem('failedAttempts', JSON.stringify(data));

    // Record metric: failed attempt count (ratio scale: n >= 0)
    failedAttemptsMetric.recordFailedAttempt(email);
}

function resetFailedAttempts(email) {
    const data = JSON.parse(localStorage.getItem('failedAttempts') || '{}');
    delete data[email];
    localStorage.setItem('failedAttempts', JSON.stringify(data));
}

class AuthManager {
    constructor() {
        this.user = null;
        this.checkAuthStatus();
    }

    async login(email, password, rememberMe = false) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Include cookies
                body: JSON.stringify({ email, password, rememberMe })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            const data = await response.json();

            // Store user data (token is in httpOnly cookie)
            this.user = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));

            // Handle MFA if required
            if (data.requiresMFA) {
                return { success: true, requiresMFA: true, data };
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(email, password, name, department = '') {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, name, department })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Registration failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.warn('Logout API call failed:', error);
        }

        // Clear local storage
        localStorage.removeItem('currentUser');
        this.user = null;

        // Redirect to login
        window.location.href = '/login.html';
    }

    async checkAuthStatus() {
        try {
            // Try to access a protected endpoint to check if authenticated
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/dashboard/stats`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                return true;
            }
        } catch (error) {
            console.warn('Auth check failed:', error);
        }

        this.user = null;
        localStorage.removeItem('currentUser');
        return false;
    }

    isAuthenticated() {
        return !!this.user;
    }

    getUser() {
        return this.user;
    }

    async forgotPassword(email) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return { success: true, message: data.message };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(token, password) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Password reset failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyEmail(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Email verification failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async setupMFA() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/mfa/setup`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'MFA setup failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async enableMFA(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/mfa/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'MFA enable failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyMFA(token) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/mfa/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ token })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'MFA verification failed');
            }

            const data = await response.json();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Sanitization utilities
function sanitizeHTML(html) {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
}

// Initialize auth manager
const authManager = new AuthManager();

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const notification = document.getElementById('notification');

    // Clear previous notification
    notification.innerHTML = '';

    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    // Check for account lockout
    const attemptData = getFailedAttempts(email);
    const timeSinceLastAttempt = Date.now() - attemptData.lastAttempt;

    if (attemptData.count >= SECURITY_CONFIG.MAX_FAILED_ATTEMPTS &&
        timeSinceLastAttempt < SECURITY_CONFIG.LOCKOUT_TIME) {
        const remainingTime = Math.ceil((SECURITY_CONFIG.LOCKOUT_TIME - timeSinceLastAttempt) / 1000 / 60);
        const metrics = failedAttemptsMetric.getMetrics();
        showNotification(`🔒 Account locked (${attemptData.count}/${SECURITY_CONFIG.MAX_FAILED_ATTEMPTS} attempts). Try again in ${remainingTime} min. [Metric: ${metrics.totalFailedAttempts} total]`, 'error', notification);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
    }

    try {
        const result = await authManager.login(email, password, rememberMe);

        if (result.success) {
            resetFailedAttempts(email);
            showNotification('Login successful! Redirecting...', 'success', notification);
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            const newCount = attemptData.count + 1;
            setFailedAttempts(email, newCount);

            const remaining = SECURITY_CONFIG.MAX_FAILED_ATTEMPTS - newCount;
            const metrics = failedAttemptsMetric.getMetrics();

            let message = result.error;
            // Display ratio scale metric: failed attempt count (n >= 0)
            if (remaining > 0) {
                message += ` [Attempt ${newCount}/${SECURITY_CONFIG.MAX_FAILED_ATTEMPTS}]`;
            } else {
                message = `🔒 Account locked after ${newCount} failed attempts [Total failed logins: ${metrics.totalFailedAttempts}]`;
            }

            showNotification(message, 'error', notification);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    } catch (error) {
        showNotification('Connection error. Make sure the server is running.', 'error', notification);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showNotification(message, type, container) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}"></i>
        ${message}
    `;
    container.innerHTML = '';
    container.appendChild(notification);

    if (type === 'success') {
        // Auto-remove success notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Check if already authenticated
if (authManager.isAuthenticated()) {
    window.location.href = 'dashboard.html';
}

// Helper function to access metrics in browser console
window.getFailedAttemptsMetrics = () => failedAttemptsMetric.getMetrics();
window.getFailedAttemptsReport = () => failedAttemptsMetric.generateReport();
window.exportFailedAttemptsCSV = () => {
    const csv = failedAttemptsMetric.exportAsCSV();
    console.log('Failed Attempts Metric Report (CSV):\n', csv);
    return csv;
};

// Register the login submit handler
window.handleLogin = handleLogin;
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});
