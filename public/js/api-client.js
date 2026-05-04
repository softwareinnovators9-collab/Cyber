/**
 * API Client Module
 * Handles all API requests with error handling and retry logic
 */

class APIClient {
    constructor(config) {
        this.baseURL = config.API.BASE_URL;
        this.timeout = config.API.TIMEOUT;
        this.retryAttempts = config.API.RETRY_ATTEMPTS;
        this.retryDelay = config.API.RETRY_DELAY;
    }

    getAuthHeader() {
        const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }

    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers
        };

        const config = {
            method,
            headers,
            credentials: 'include',
            signal: AbortSignal.timeout(this.timeout)
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        let lastError;

        for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, config);

                if (!response.ok) {
                    if (response.status === 401) {
                        // Token expired or invalid
                        localStorage.removeItem(CONFIG.STORAGE.TOKEN);
                        localStorage.removeItem(CONFIG.STORAGE.USER);
                        window.location.href = 'login.html';
                        throw new Error('Authentication required');
                    }

                    const error = await response.json();
                    throw new Error(error.error || `HTTP ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;

                if (attempt < this.retryAttempts - 1 && error.name !== 'AbortError') {
                    await this.sleep(this.retryDelay * (attempt + 1));
                    continue;
                }

                throw lastError;
            }
        }

        throw lastError;
    }

    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data = {}, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data = {}, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data = {}, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize API client
const apiClient = new APIClient(CONFIG);

// API Endpoints
const API_ENDPOINTS = {
    // Auth
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VALIDATE_TOKEN: '/api/auth/validate-token',

    // Dashboard
    DASHBOARD: '/api/dashboard',
    DASHBOARD_HEALTH: '/api/dashboard/health',
    DASHBOARD_TIMELINE: '/api/dashboard/timeline',

    // Devices
    DEVICES: '/api/devices',
    DEVICE: (id) => `/api/devices/${id}`,

    // Incidents
    INCIDENTS: '/api/incidents',
    INCIDENT: (id) => `/api/incidents/${id}`,
    INCIDENT_COMMENTS: (id) => `/api/incidents/${id}/comments`,

    // Threats
    THREATS: '/api/threats',
    THREAT: (id) => `/api/threats/${id}`,
    THREAT_STATUS: (id) => `/api/threats/${id}/status`,
    THREAT_CONTAINMENT: (id) => `/api/threats/${id}/containment`,

    // Audit
    AUDIT_LOGS: '/api/audit-logs',
    AUDIT_USER: (id) => `/api/audit-logs/user/${id}`,
    AUDIT_EXPORT: '/api/audit-logs/export/csv',

    // Users
    USERS: '/api/users',
    CURRENT_USER: '/api/users/me'
};