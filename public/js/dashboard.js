/**
 * Dashboard Module
 * Main dashboard logic and data management
 */

class DashboardManager {
    constructor() {
        this.data = {
            threats: [],
            incidents: [],
            devices: [],
            auditLogs: [],
            stats: {}
        };
        this.currentSection = 'dashboard';
        this.filters = {};
        this.init();
    }

    async init() {
        this.showLoadingOverlay();
        try {
            // Check authentication
            const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
            if (!token) {
                window.location.href = 'login.html';
                return;
            }

            // Setup UI
            this.setupUI();

            // Activate dashboard section
            this.switchSection('dashboard');

            // Connect WebSocket (non-fatal — dashboard works without live feed)
            try {
                await wsManager.connect(token);
            } catch (wsError) {
                console.warn('WebSocket connection failed, continuing without live feed:', wsError);
            }

            // Load all data in parallel for faster startup
            await Promise.allSettled([
                this.loadDashboard(),
                this.loadThreats(),
                this.loadIncidents(),
                this.loadDevices(),
                this.loadAuditLogs()
            ]);

            // Setup auto-refresh
            this.setupAutoRefresh();

            // Setup event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            showToast('Failed to initialize dashboard', 'error');
        } finally {
            // Always remove the overlay — whether init succeeded or failed
            this.hideLoadingOverlay();
        }
    }

    showLoadingOverlay() {
        let overlay = document.getElementById('dashboardLoadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'dashboardLoadingOverlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(10, 14, 26, 0.85);
                display: flex; align-items: center; justify-content: center;
                flex-direction: column; gap: 16px;
            `;
            overlay.innerHTML = `
                <div style="
                    width: 48px; height: 48px; border-radius: 50%;
                    border: 3px solid rgba(102,126,234,0.2);
                    border-top-color: #667eea;
                    animation: dashSpin 0.8s linear infinite;
                "></div>
                <span style="color: #a0aec0; font-size: 14px; font-family: inherit;">
                    Loading dashboard...
                </span>
                <style>
                    @keyframes dashSpin { to { transform: rotate(360deg); } }
                </style>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('dashboardLoadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    setupUI() {
        const user = JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || '{}');

        if (user.name) {
            document.getElementById('userName').textContent = user.name;
            document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        }

        // Close any open modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });

        // Setup navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });
    }

    setupEventListeners() {
        // WebSocket events
        wsManager.on('threat-detected', (threat) => {
            this.data.threats.unshift(threat);
            this.updateThreatFeed();
            showToast(`Threat Detected: ${threat.type}`, 'warning');
            this.updateNotificationBadge();
        });

        wsManager.on('incident-created', (incident) => {
            this.data.incidents.unshift(incident);
            this.updateIncidentsTable();
            showToast('New incident created', 'info');
        });

        wsManager.on('incident-updated', (incident) => {
            const index = this.data.incidents.findIndex(i => i.id === incident.id);
            if (index !== -1) {
                this.data.incidents[index] = incident;
            }
            this.updateIncidentsTable();
        });

        wsManager.on('device-status-changed', (device) => {
            const index = this.data.devices.findIndex(d => d.id === device.id);
            if (index !== -1) {
                this.data.devices[index] = device;
            }
            this.updateDevicesTable();
        });
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (this.currentSection === 'dashboard') {
                this.loadDashboard();
            }
        }, CONFIG.UI.REFRESH_INTERVAL);
    }

    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update sections
        document.querySelectorAll('.section').forEach(s => {
            s.classList.remove('active');
        });
        document.getElementById(`${section}-section`).classList.add('active');

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            threats: 'Security Threats',
            incidents: 'Incident Management',
            devices: 'Device Management',
            audit: 'Audit Logs',
            settings: 'Settings'
        };
        document.getElementById('page-title').textContent = titles[section] || 'Dashboard';

        this.currentSection = section;
    }

    async loadDashboard() {
        try {
            const stats = await apiClient.get(API_ENDPOINTS.DASHBOARD);
            this.data.stats = stats;
            this.updateStatsGrid();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            showToast('Failed to load dashboard stats', 'error');
        }
    }

    async loadThreats() {
        try {
            this.data.threats = await apiClient.get(API_ENDPOINTS.THREATS);
            this.updateThreatFeed();
            this.updateThreatsTable();
        } catch (error) {
            console.error('Failed to load threats:', error);
        }
    }

    async loadIncidents() {
        try {
            this.data.incidents = await apiClient.get(API_ENDPOINTS.INCIDENTS);
            this.updateIncidentsTable();
        } catch (error) {
            console.error('Failed to load incidents:', error);
        }
    }

    async loadDevices() {
        try {
            this.data.devices = await apiClient.get(API_ENDPOINTS.DEVICES);
            this.updateDevicesTable();
            this.updateIncidentDeviceSelect();
        } catch (error) {
            console.error('Failed to load devices:', error);
        }
    }

    async loadAuditLogs() {
        try {
            this.data.auditLogs = await apiClient.get(API_ENDPOINTS.AUDIT_LOGS + '?limit=100');
            this.updateAuditTable();
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        }
    }

    updateStatsGrid() {
        const stats = this.data.stats;
        const grid = document.getElementById('statsGrid');

        const statsConfig = [
            { label: 'Total Devices', value: stats.totalDevices, icon: 'server', color: '#667eea' },
            { label: 'Online Devices', value: stats.onlineDevices, icon: 'check-circle', color: '#27ae60' },
            { label: 'Active Incidents', value: stats.activeIncidents, icon: 'fire', color: '#e74c3c' },
            { label: 'Total Threats', value: stats.totalThreats, icon: 'shield-alt', color: '#f39c12' },
            { label: 'Critical Threats', value: stats.criticalThreats, icon: 'exclamation-circle', color: '#c0392b' },
            { label: 'Security Score', value: `${stats.securityScore}%`, icon: 'percent', color: '#9b59b6' }
        ];

        grid.innerHTML = statsConfig.map(stat => `
      <div class="stat-card">
        <div class="stat-content">
          <h3>${stat.label}</h3>
          <div class="value">${stat.value}</div>
        </div>
        <div class="stat-icon" style="color: ${stat.color};">
          <i class="fas fa-${stat.icon}"></i>
        </div>
      </div>
    `).join('');
    }

    updateThreatFeed() {
        const feed = document.getElementById('threatFeed');

        if (this.data.threats.length === 0) {
            feed.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-shield-alt"></i>
          <p>No threats detected</p>
        </div>
      `;
            return;
        }

        const recentThreats = this.data.threats.slice(0, 5);
        feed.innerHTML = recentThreats.map(threat => `
      <div class="threat-item">
        <div class="threat-info">
          <div class="threat-type">${threat.type}</div>
          <div class="threat-details">
            From: ${threat.source} → To: ${threat.target} | 
            ${new Date(threat.timestamp).toLocaleString()}
          </div>
        </div>
        <span class="badge badge-${threat.severity}">${threat.severity.toUpperCase()}</span>
      </div>
    `).join('');
    }

    updateThreatsTable() {
        const tbody = document.getElementById('threatsTbody');

        if (this.data.threats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No threats found</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.threats.map(threat => `
      <tr>
        <td>${threat.type}</td>
        <td><span class="badge badge-${threat.severity}">${threat.severity}</span></td>
        <td>${threat.source}</td>
        <td>${threat.target}</td>
        <td>${new Date(threat.timestamp).toLocaleString()}</td>
        <td><span class="badge badge-success">${threat.status}</span></td>
        <td>
          <div class="action-icons">
            <button class="action-btn" title="View Details" onclick="viewThreat('${threat.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" title="Mitigate" onclick="mitigateThreat('${threat.id}')">
              <i class="fas fa-shield-check"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    updateIncidentsTable() {
        const tbody = document.getElementById('incidentsTbody');

        if (this.data.incidents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No incidents found</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.incidents.map(incident => `
      <tr>
        <td>${incident.title}</td>
        <td><span class="badge badge-${incident.severity}">${incident.severity}</span></td>
        <td><span class="badge" style="background: ${incident.status === 'open' ? 'rgba(231,76,60,0.2)' : 'rgba(39,174,96,0.2)'}; color: ${incident.status === 'open' ? '#e74c3c' : '#27ae60'};">${incident.status}</span></td>
        <td>${incident.deviceId || '-'}</td>
        <td>${new Date(incident.createdAt).toLocaleDateString()}</td>
        <td>${incident.assignedTo || '-'}</td>
        <td>
          <div class="action-icons">
            <button class="action-btn" title="Edit" onclick="editIncident('${incident.id}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn" title="Delete" onclick="deleteIncident('${incident.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    updateDevicesTable() {
        const tbody = document.getElementById('devicesTbody');

        if (this.data.devices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No devices found</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.devices.map(device => `
      <tr>
        <td>${device.name}</td>
        <td>${device.ip}</td>
        <td>${device.osType}</td>
        <td><span class="badge badge-${device.status === 'online' ? 'success' : 'error'}">${device.status}</span></td>
        <td><span class="badge badge-${device.threatLevel}">${device.threatLevel}</span></td>
        <td>${new Date(device.lastSeen).toLocaleString()}</td>
        <td>
          <div class="action-icons">
            <button class="action-btn" title="View" onclick="viewDevice('${device.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn" title="Delete" onclick="deleteDevice('${device.id}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    }

    updateAuditTable() {
        const tbody = document.getElementById('auditTbody');

        if (this.data.auditLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No logs found</td></tr>';
            return;
        }

        tbody.innerHTML = this.data.auditLogs.map(log => `
      <tr>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td><strong>${log.action}</strong></td>
        <td>${log.user}</td>
        <td>${log.resourceType || '-'}</td>
        <td><span class="badge" style="background: ${log.status === 'success' ? 'rgba(39,174,96,0.2)' : 'rgba(231,76,60,0.2)'}; color: ${log.status === 'success' ? '#27ae60' : '#e74c3c'};">${log.status}</span></td>
        <td>${log.details || '-'}</td>
      </tr>
    `).join('');
    }

    updateIncidentDeviceSelect() {
        const select = document.getElementById('incidentDevice');
        select.innerHTML = '<option value="">Select a device</option>' +
            this.data.devices.map(d => `<option value="${d.id}">${d.name} (${d.ip})</option>`).join('');
    }

    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        const criticalThreats = this.data.threats.filter(t => t.severity === 'critical').length;
        const openIncidents = this.data.incidents.filter(i => i.status === 'open').length;
        const total = criticalThreats + openIncidents;
        badge.textContent = total;
    }
}

// Initialize dashboard
const dashboard = new DashboardManager();