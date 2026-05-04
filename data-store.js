// ────────────────────────────────────────────────────────────────────────────
// CyberShield CSWS — Centralized Data Store (Persistent)
// This module handles all data operations with localStorage persistence
// ────────────────────────────────────────────────────────────────────────────

'use strict';

const DataStore = {
    KEYS: {
        DEVICES: 'csws_devices',
        THREATS: 'csws_threats',
        INCIDENTS: 'csws_incidents',
        USERS: 'csws_users',
        AUDIT_LOGS: 'csws_audit_logs',
        NOTIFICATIONS: 'csws_notifications',
        SESSION: 'csws_user'
    },

    // Initialize with default data if empty
    init() {
        this.initDevices();
        this.initThreats();
        this.initIncidents();
        this.initUsers();
        this.initAuditLogs();
        this.initNotifications();
        console.log('DataStore initialized with persistent storage');
    },

    // ── Devices ───────────────────────────────────────────────────────────────
    initDevices() {
        const defaultDevices = [
            { id: 1, uuid: 'dev-1', device_name: 'Server-01', device_type: 'server', ip_address: '192.168.1.100', status: 'online', risk_score: 25, owner_name: 'Admin User', open_threats: 2, created_at: new Date().toISOString() },
            { id: 2, uuid: 'dev-2', device_name: 'Workstation-01', device_type: 'workstation', ip_address: '192.168.1.101', status: 'offline', risk_score: 45, owner_name: 'Admin User', open_threats: 0, created_at: new Date().toISOString() },
            { id: 3, uuid: 'dev-3', device_name: 'Mobile-01', device_type: 'mobile', ip_address: '192.168.1.102', status: 'online', risk_score: 15, owner_name: 'Admin User', open_threats: 1, created_at: new Date().toISOString() },
            { id: 4, uuid: 'dev-4', device_name: 'Router-Main', device_type: 'router', ip_address: '192.168.1.1', status: 'online', risk_score: 10, owner_name: 'Admin User', open_threats: 0, created_at: new Date().toISOString() },
            { id: 5, uuid: 'dev-5', device_name: 'Database-Server', device_type: 'server', ip_address: '192.168.1.50', status: 'online', risk_score: 30, owner_name: 'Admin User', open_threats: 1, created_at: new Date().toISOString() },
            { id: 6, uuid: 'dev-6', device_name: 'IoT-Gateway', device_type: 'iot', ip_address: '192.168.1.200', status: 'online', risk_score: 65, owner_name: 'Admin User', open_threats: 3, created_at: new Date().toISOString() },
            { id: 7, uuid: 'dev-7', device_name: 'Workstation-02', device_type: 'workstation', ip_address: '192.168.1.103', status: 'online', risk_score: 20, owner_name: 'John Analyst', open_threats: 0, created_at: new Date().toISOString() },
            { id: 8, uuid: 'dev-8', device_name: 'Firewall-Primary', device_type: 'server', ip_address: '192.168.1.254', status: 'online', risk_score: 5, owner_name: 'Admin User', open_threats: 0, created_at: new Date().toISOString() }
        ];

        if (!localStorage.getItem(this.KEYS.DEVICES)) {
            this.saveData(this.KEYS.DEVICES, defaultDevices);
        }
    },

    getDevices() {
        return this.loadData(this.KEYS.DEVICES);
    },

    saveDevices(devices) {
        this.saveData(this.KEYS.DEVICES, devices);
    },

    addDevice(device) {
        const devices = this.getDevices();
        device.id = Math.max(...devices.map(d => d.id), 0) + 1;
        device.uuid = `dev-${Date.now()}`;
        device.created_at = new Date().toISOString();
        devices.push(device);
        this.saveDevices(devices);
        this.logAudit('device_create', 'devices', device.uuid, `Created device: ${device.device_name}`);
        return device;
    },

    updateDevice(uuid, updates) {
        const devices = this.getDevices();
        const index = devices.findIndex(d => d.uuid === uuid);
        if (index !== -1) {
            devices[index] = { ...devices[index], ...updates };
            this.saveDevices(devices);
            this.logAudit('device_update', 'devices', uuid, `Updated device: ${devices[index].device_name}`);
            return devices[index];
        }
        return null;
    },

    deleteDevice(uuid) {
        const devices = this.getDevices();
        const device = devices.find(d => d.uuid === uuid);
        const filtered = devices.filter(d => d.uuid !== uuid);
        this.saveDevices(filtered);
        if (device) {
            this.logAudit('device_delete', 'devices', uuid, `Deleted device: ${device.device_name}`);
        }
        return filtered;
    },

    // ── Threats ───────────────────────────────────────────────────────────────
    initThreats() {
        const defaultThreats = [
            { id: 1, uuid: 'threat-1', title: 'Suspicious Login Attempt', severity: 'high', category: 'intrusion', status: 'open', device_name: 'Server-01', detected_at: new Date().toISOString(), assigned_to: null },
            { id: 2, uuid: 'threat-2', title: 'Malware Detected', severity: 'critical', category: 'malware', status: 'open', device_name: 'Workstation-01', detected_at: new Date(Date.now() - 3600000).toISOString(), assigned_to: null },
            { id: 3, uuid: 'threat-3', title: 'Phishing Email', severity: 'medium', category: 'phishing', status: 'investigating', device_name: 'Mobile-01', detected_at: new Date(Date.now() - 7200000).toISOString(), assigned_to: 'John Analyst' },
            { id: 4, uuid: 'threat-4', title: 'DDoS Attack', severity: 'critical', category: 'dos', status: 'open', device_name: 'Router-Main', detected_at: new Date(Date.now() - 1800000).toISOString(), assigned_to: null },
            { id: 5, uuid: 'threat-5', title: 'Unauthorized Access', severity: 'high', category: 'intrusion', status: 'resolved', device_name: 'Database-Server', detected_at: new Date(Date.now() - 86400000).toISOString(), assigned_to: 'Admin User' },
            { id: 6, uuid: 'threat-6', title: 'SQL Injection Attempt', severity: 'critical', category: 'injection', status: 'open', device_name: 'Database-Server', detected_at: new Date(Date.now() - 900000).toISOString(), assigned_to: null },
            { id: 7, uuid: 'threat-7', title: 'Ransomware Detection', severity: 'critical', category: 'malware', status: 'open', device_name: 'Workstation-02', detected_at: new Date(Date.now() - 300000).toISOString(), assigned_to: null },
            { id: 8, uuid: 'threat-8', title: 'Port Scan Detected', severity: 'low', category: 'reconnaissance', status: 'investigating', device_name: 'Firewall-Primary', detected_at: new Date(Date.now() - 5400000).toISOString(), assigned_to: 'Jane Viewer' }
        ];

        if (!localStorage.getItem(this.KEYS.THREATS)) {
            this.saveData(this.KEYS.THREATS, defaultThreats);
        }
    },

    getThreats() {
        return this.loadData(this.KEYS.THREATS);
    },

    saveThreats(threats) {
        this.saveData(this.KEYS.THREATS, threats);
    },

    addThreat(threat) {
        const threats = this.getThreats();
        threat.id = Math.max(...threats.map(t => t.id), 0) + 1;
        threat.uuid = `threat-${Date.now()}`;
        threat.detected_at = new Date().toISOString();
        threats.push(threat);
        this.saveThreats(threats);
        this.logAudit('threat_create', 'threats', threat.uuid, `Created threat: ${threat.title}`);
        return threat;
    },

    updateThreat(uuid, updates) {
        const threats = this.getThreats();
        const index = threats.findIndex(t => t.uuid === uuid);
        if (index !== -1) {
            threats[index] = { ...threats[index], ...updates };
            this.saveThreats(threats);
            this.logAudit('threat_update', 'threats', uuid, `Updated threat: ${threats[index].title}`);
            return threats[index];
        }
        return null;
    },

    deleteThreat(uuid) {
        const threats = this.getThreats();
        const threat = threats.find(t => t.uuid === uuid);
        const filtered = threats.filter(t => t.uuid !== uuid);
        this.saveThreats(filtered);
        if (threat) {
            this.logAudit('threat_delete', 'threats', uuid, `Deleted threat: ${threat.title}`);
        }
        return filtered;
    },

    // ── Incidents ─────────────────────────────────────────────────────────────
    initIncidents() {
        const defaultIncidents = [
            { id: 1, uuid: 'inc-1', title: 'Security Incident #1', severity: 'high', status: 'open', description: 'Initial security breach investigation', created_by_name: 'Admin User', created_at: new Date().toISOString(), assigned_to: null },
            { id: 2, uuid: 'inc-2', title: 'Data Breach Investigation', severity: 'critical', status: 'in_progress', description: 'Investigating potential data breach', created_by_name: 'Admin User', created_at: new Date(Date.now() - 86400000).toISOString(), assigned_to: 'John Analyst' },
            { id: 3, uuid: 'inc-3', title: 'Malware Outbreak', severity: 'critical', status: 'open', description: 'Ransomware detected on multiple workstations', created_by_name: 'John Analyst', created_at: new Date(Date.now() - 3600000).toISOString(), assigned_to: null },
            { id: 4, uuid: 'inc-4', title: 'Phishing Campaign', severity: 'medium', status: 'resolved', description: 'Company-wide phishing email identified and contained', created_by_name: 'Admin User', created_at: new Date(Date.now() - 172800000).toISOString(), assigned_to: 'Jane Viewer' },
            { id: 5, uuid: 'inc-5', title: 'Unauthorized Access Attempt', severity: 'high', status: 'in_progress', description: 'Multiple failed login attempts detected', created_by_name: 'Admin User', created_at: new Date(Date.now() - 7200000).toISOString(), assigned_to: 'John Analyst' }
        ];

        if (!localStorage.getItem(this.KEYS.INCIDENTS)) {
            this.saveData(this.KEYS.INCIDENTS, defaultIncidents);
        }
    },

    getIncidents() {
        return this.loadData(this.KEYS.INCIDENTS);
    },

    saveIncidents(incidents) {
        this.saveData(this.KEYS.INCIDENTS, incidents);
    },

    addIncident(incident) {
        const incidents = this.getIncidents();
        incident.id = Math.max(...incidents.map(i => i.id), 0) + 1;
        incident.uuid = `inc-${Date.now()}`;
        incident.created_at = new Date().toISOString();
        incidents.push(incident);
        this.saveIncidents(incidents);
        this.logAudit('incident_create', 'incidents', incident.uuid, `Created incident: ${incident.title}`);
        return incident;
    },

    updateIncident(uuid, updates) {
        const incidents = this.getIncidents();
        const index = incidents.findIndex(i => i.uuid === uuid);
        if (index !== -1) {
            incidents[index] = { ...incidents[index], ...updates };
            this.saveIncidents(incidents);
            this.logAudit('incident_update', 'incidents', uuid, `Updated incident: ${incidents[index].title}`);
            return incidents[index];
        }
        return null;
    },

    deleteIncident(uuid) {
        const incidents = this.getIncidents();
        const incident = incidents.find(i => i.uuid === uuid);
        const filtered = incidents.filter(i => i.uuid !== uuid);
        this.saveIncidents(filtered);
        if (incident) {
            this.logAudit('incident_delete', 'incidents', uuid, `Deleted incident: ${incident.title}`);
        }
        return filtered;
    },

    // ── Users ────────────────────────────────────────────────────────────────
    initUsers() {
        const defaultUsers = [
            { id: 1, uuid: 'admin-uuid', name: 'Admin User', email: 'admin@cybershield.io', role: 'admin', status: 'active', created_at: new Date().toISOString() },
            { id: 2, uuid: 'user-2', name: 'John Analyst', email: 'john@cybershield.io', role: 'analyst', status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() },
            { id: 3, uuid: 'user-3', name: 'Jane Viewer', email: 'jane@cybershield.io', role: 'viewer', status: 'active', created_at: new Date(Date.now() - 172800000).toISOString() },
            { id: 4, uuid: 'user-4', name: 'Mike Security', email: 'mike@cybershield.io', role: 'analyst', status: 'active', created_at: new Date(Date.now() - 259200000).toISOString() },
            { id: 5, uuid: 'user-5', name: 'Sarah Admin', email: 'sarah@cybershield.io', role: 'admin', status: 'active', created_at: new Date(Date.now() - 345600000).toISOString() }
        ];

        if (!localStorage.getItem(this.KEYS.USERS)) {
            this.saveData(this.KEYS.USERS, defaultUsers);
        }
    },

    getUsers() {
        return this.loadData(this.KEYS.USERS);
    },

    saveUsers(users) {
        this.saveData(this.KEYS.USERS, users);
    },

    addUser(user) {
        const users = this.getUsers();
        user.id = Math.max(...users.map(u => u.id), 0) + 1;
        user.uuid = `user-${Date.now()}`;
        user.created_at = new Date().toISOString();
        user.status = 'active';
        users.push(user);
        this.saveUsers(users);
        this.logAudit('user_create', 'users', user.uuid, `Created user: ${user.name}`);
        return user;
    },

    updateUser(uuid, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => u.uuid === uuid);
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveUsers(users);
            this.logAudit('user_update', 'users', uuid, `Updated user: ${users[index].name}`);
            return users[index];
        }
        return null;
    },

    deleteUser(uuid) {
        const users = this.getUsers();
        const user = users.find(u => u.uuid === uuid);
        const filtered = users.filter(u => u.uuid !== uuid);
        this.saveUsers(filtered);
        if (user) {
            this.logAudit('user_delete', 'users', uuid, `Deleted user: ${user.name}`);
        }
        return filtered;
    },

    // ── Audit Logs ───────────────────────────────────────────────────────────
    initAuditLogs() {
        const defaultLogs = [
            { id: 1, user_name: 'Admin User', action: 'login', resource: 'auth', ip_address: '192.168.1.1', status: 'success', created_at: new Date().toISOString() },
            { id: 2, user_name: 'Admin User', action: 'device_view', resource: 'devices', ip_address: '192.168.1.1', status: 'success', created_at: new Date(Date.now() - 600000).toISOString() },
            { id: 3, user_name: 'John Analyst', action: 'threat_view', resource: 'threats', ip_address: '192.168.1.50', status: 'success', created_at: new Date(Date.now() - 1200000).toISOString() },
            { id: 4, user_name: 'Admin User', action: 'incident_create', resource: 'incidents', ip_address: '192.168.1.1', status: 'success', created_at: new Date(Date.now() - 1800000).toISOString() },
            { id: 5, user_name: 'Jane Viewer', action: 'audit_view', resource: 'audit', ip_address: '192.168.1.75', status: 'success', created_at: new Date(Date.now() - 3600000).toISOString() }
        ];

        if (!localStorage.getItem(this.KEYS.AUDIT_LOGS)) {
            this.saveData(this.KEYS.AUDIT_LOGS, defaultLogs);
        }
    },

    getAuditLogs() {
        return this.loadData(this.KEYS.AUDIT_LOGS);
    },

    saveAuditLogs(logs) {
        this.saveData(this.KEYS.AUDIT_LOGS, logs);
    },

    logAudit(action, resource, resourceId, details) {
        const logs = this.getAuditLogs();
        const user = this.getCurrentUser();
        const newLog = {
            id: Math.max(...logs.map(l => l.id), 0) + 1,
            user_name: user ? user.name : 'System',
            action: action,
            resource: resource,
            resource_id: resourceId,
            details: details,
            ip_address: '192.168.1.1', // Mock IP
            status: 'success',
            created_at: new Date().toISOString()
        };
        logs.unshift(newLog); // Add to beginning
        // Keep only last 500 logs
        if (logs.length > 500) logs.length = 500;
        this.saveAuditLogs(logs);
        return newLog;
    },

    // ── Notifications ────────────────────────────────────────────────────────
    initNotifications() {
        const defaultNotifications = [
            { id: 1, title: 'New Threat Detected', message: 'High severity threat on Server-01', type: 'danger', is_read: false, created_at: new Date().toISOString() },
            { id: 2, title: 'Device Offline', message: 'Workstation-01 has gone offline', type: 'warning', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
            { id: 3, title: 'System Update', message: 'Security definitions updated successfully', type: 'success', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 4, title: 'Critical Incident', message: 'Malware outbreak detected requiring immediate attention', type: 'danger', is_read: false, created_at: new Date(Date.now() - 900000).toISOString() },
            { id: 5, title: 'User Login', message: 'John Analyst logged in successfully', type: 'info', is_read: true, created_at: new Date(Date.now() - 7200000).toISOString() }
        ];

        if (!localStorage.getItem(this.KEYS.NOTIFICATIONS)) {
            this.saveData(this.KEYS.NOTIFICATIONS, defaultNotifications);
        }
    },

    getNotifications() {
        return this.loadData(this.KEYS.NOTIFICATIONS);
    },

    saveNotifications(notifications) {
        this.saveData(this.KEYS.NOTIFICATIONS, notifications);
    },

    addNotification(notification) {
        const notifications = this.getNotifications();
        notification.id = Math.max(...notifications.map(n => n.id), 0) + 1;
        notification.created_at = new Date().toISOString();
        notification.is_read = false;
        notifications.unshift(notification);
        // Keep only last 100 notifications
        if (notifications.length > 100) notifications.length = 100;
        this.saveNotifications(notifications);
        return notification;
    },

    markNotificationRead(id) {
        const notifications = this.getNotifications();
        const notif = notifications.find(n => n.id === id);
        if (notif) {
            notif.is_read = true;
            this.saveNotifications(notifications);
        }
        return notifications;
    },

    // ── Session Management ──────────────────────────────────────────────────
    getCurrentUser() {
        const stored = localStorage.getItem(this.KEYS.SESSION);
        return stored ? JSON.parse(stored) : null;
    },

    setCurrentUser(user) {
        localStorage.setItem(this.KEYS.SESSION, JSON.stringify(user));
        this.logAudit('login', 'auth', user.uuid, `User logged in: ${user.name}`);
    },

    clearCurrentUser() {
        const user = this.getCurrentUser();
        if (user) {
            this.logAudit('logout', 'auth', user.uuid, `User logged out: ${user.name}`);
        }
        localStorage.removeItem(this.KEYS.SESSION);
    },

    // ── Authentication ──────────────────────────────────────────────────────
    authenticate(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.status === 'active');

        // Demo credentials: admin@cybershield.io / Admin@CyberShield1
        if (email === 'admin@cybershield.io' && password === 'Admin@CyberShield1') {
            const adminUser = users.find(u => u.role === 'admin');
            if (adminUser) {
                this.setCurrentUser(adminUser);
                return adminUser;
            }
        }

        if (user && password === 'Demo@123') {
            this.setCurrentUser(user);
            return user;
        }

        return null;
    },

    // ── Base Storage Methods ────────────────────────────────────────────────
    loadData(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error(`Error loading ${key}:`, e);
            return [];
        }
    },

    saveData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key}:`, e);
        }
    },

    // ── Statistics ──────────────────────────────────────────────────────────
    getStats() {
        const devices = this.getDevices();
        const threats = this.getThreats();
        const incidents = this.getIncidents();
        const users = this.getUsers();

        return {
            totalDevices: devices.length,
            onlineDevices: devices.filter(d => d.status === 'online').length,
            totalThreats: threats.length,
            openThreats: threats.filter(t => t.status === 'open').length,
            criticalThreats: threats.filter(t => t.severity === 'critical' && t.status === 'open').length,
            totalIncidents: incidents.length,
            openIncidents: incidents.filter(i => i.status === 'open').length,
            inProgressIncidents: incidents.filter(i => i.status === 'in_progress').length,
            totalUsers: users.length,
            activeUsers: users.filter(u => u.status === 'active').length,
            securityScore: this.calculateSecurityScore(devices, threats)
        };
    },

    calculateSecurityScore(devices, threats) {
        if (devices.length === 0) return 100;

        const avgRisk = devices.reduce((sum, d) => sum + d.risk_score, 0) / devices.length;
        const criticalThreats = threats.filter(t => t.severity === 'critical' && t.status === 'open').length;
        const threatPenalty = Math.min(criticalThreats * 10, 30);

        return Math.max(0, Math.min(100, Math.round(100 - avgRisk - threatPenalty)));
    },

    // ── Reset Data ──────────────────────────────────────────────────────────
    resetAllData() {
        Object.values(this.KEYS).forEach(key => {
            if (key !== this.KEYS.SESSION) {
                localStorage.removeItem(key);
            }
        });
        this.init();
        console.log('All data has been reset to defaults');
    }
};

// Auto-initialize when loaded
DataStore.init();