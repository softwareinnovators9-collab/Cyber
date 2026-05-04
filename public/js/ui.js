/**
 * UI Module
 * Handles UI interactions and utilities
 */

// Toast notifications
function showToast(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <i class="fas fa-${getIconForType(type)}"></i>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;

    container.appendChild(toast);

    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
}

function getIconForType(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Close modal when clicking outside or on overlay
document.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        if (e.target === modal || e.target.classList.contains('modal')) {
            modal.classList.remove('active');
        }
    });
});

// Emergency close all modals function
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Keyboard close
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Incident functions
async function createIncident(event) {
    event.preventDefault();

    const data = {
        title: document.getElementById('incidentTitle').value,
        description: document.getElementById('incidentDesc').value,
        severity: document.getElementById('incidentSeverity').value,
        priority: document.getElementById('incidentPriority').value,
        deviceId: document.getElementById('incidentDevice').value,
        tags: []
    };

    try {
        await apiClient.post(API_ENDPOINTS.INCIDENTS, data);
        showToast('Incident created successfully', 'success');
        closeModal('incidentModal');
        document.getElementById('incidentForm').reset();
        await dashboard.loadIncidents();
    } catch (error) {
        showToast('Failed to create incident', 'error');
        console.error(error);
    }
}

function openIncidentModal() {
    openModal('incidentModal');
}

async function editIncident(id) {
    const incident = dashboard.data.incidents.find(i => i.id === id);
    if (!incident) return;

    document.getElementById('incidentTitle').value = incident.title;
    document.getElementById('incidentDesc').value = incident.description;
    document.getElementById('incidentSeverity').value = incident.severity;
    document.getElementById('incidentPriority').value = incident.priority;

    openModal('incidentModal');
}

async function deleteIncident(id) {
    if (!confirm('Are you sure you want to delete this incident?')) return;

    try {
        await apiClient.delete(API_ENDPOINTS.INCIDENT(id));
        showToast('Incident deleted', 'success');
        await dashboard.loadIncidents();
    } catch (error) {
        showToast('Failed to delete incident', 'error');
    }
}

// Device functions
async function createDevice(event) {
    event.preventDefault();

    const data = {
        name: document.getElementById('deviceName').value,
        ip: document.getElementById('deviceIp').value,
        macAddress: document.getElementById('deviceMac').value || null,
        osType: document.getElementById('deviceOs').value,
        location: document.getElementById('deviceLocation').value || null
    };

    try {
        await apiClient.post(API_ENDPOINTS.DEVICES, data);
        showToast('Device added successfully', 'success');
        closeModal('deviceModal');
        document.getElementById('deviceForm').reset();
        await dashboard.loadDevices();
    } catch (error) {
        showToast('Failed to add device', 'error');
        console.error(error);
    }
}

function openDeviceModal() {
    openModal('deviceModal');
}

async function deleteDevice(id) {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
        await apiClient.delete(API_ENDPOINTS.DEVICE(id));
        showToast('Device deleted', 'success');
        await dashboard.loadDevices();
    } catch (error) {
        showToast('Failed to delete device', 'error');
    }
}

async function viewDevice(id) {
    showToast('Device detail view coming soon', 'info');
}

// Threat functions
async function mitigateThreat(id) {
    try {
        await apiClient.patch(API_ENDPOINTS.THREAT_STATUS(id), { status: 'mitigated' });
        showToast('Threat status updated', 'success');
        await dashboard.loadThreats();
    } catch (error) {
        showToast('Failed to update threat', 'error');
    }
}

async function viewThreat(id) {
    showToast('Threat detail view coming soon', 'info');
}

function filterThreats(severity) {
    if (severity === 'all') {
        dashboard.updateThreatsTable();
    } else {
        const filtered = dashboard.data.threats.filter(t => t.severity === severity);
        const tbody = document.getElementById('threatsTbody');
        tbody.innerHTML = filtered.map(threat => `
      <tr>
        <td>${threat.type}</td>
        <td><span class="badge badge-${threat.severity}">${threat.severity}</span></td>
        <td>${threat.source}</td>
        <td>${threat.target}</td>
        <td>${new Date(threat.timestamp).toLocaleString()}</td>
        <td><span class="badge badge-success">${threat.status}</span></td>
        <td>
          <div class="action-icons">
            <button class="action-btn" onclick="viewThreat('${threat.id}')">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    }
}

// Audit functions
async function exportAuditLogs() {
    try {
        const response = await fetch(`${CONFIG.API.BASE_URL}${API_ENDPOINTS.AUDIT_EXPORT}`, {
            headers: { ...apiClient.getAuthHeader() }
        });

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        showToast('Audit logs exported', 'success');
    } catch (error) {
        showToast('Failed to export logs', 'error');
    }
}

// Settings
function saveSettings() {
    try {
        const settings = {
            theme: document.getElementById('themeSelect').value,
            notifications: {
                threat: document.getElementById('threatNotif').checked,
                incident: document.getElementById('incidentNotif').checked,
                device: document.getElementById('deviceNotif').checked
            }
        };

        localStorage.setItem('dashboardSettings', JSON.stringify(settings));
        showToast('Settings saved', 'success');
    } catch (error) {
        console.error('Failed to save dashboard settings:', error);
        showToast('Unable to save settings', 'error');
    }
}

// Logout
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) {
        return;
    }

    try {
        await fetch(`${CONFIG.API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.warn('Logout request failed:', error);
    }

    localStorage.removeItem(CONFIG.STORAGE.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE.USER);

    if (typeof wsManager !== 'undefined' && wsManager?.disconnect) {
        try {
            wsManager.disconnect();
        } catch (wsError) {
            console.warn('WebSocket disconnect failed:', wsError);
        }
    }

    window.location.href = 'login.html';
}

function showNotifications() {
    showToast('No new notifications at the moment.', 'info');
}

function openSettingsSection() {
    if (typeof dashboard !== 'undefined' && dashboard.switchSection) {
        dashboard.switchSection('settings');
    }
}

function viewHealthDetails() {
    if (typeof dashboard !== 'undefined' && dashboard.switchSection) {
        dashboard.switchSection('threats');
    }
    showToast('Switching to threat details for deeper system health context.', 'info');
}

function viewThreatTimeline() {
    if (typeof dashboard !== 'undefined' && dashboard.switchSection) {
        dashboard.switchSection('threats');
    }
    showToast('Showing the full threat timeline.', 'info');
}

window.saveSettings = saveSettings;
window.handleLogout = handleLogout;
window.showNotifications = showNotifications;
window.openSettingsSection = openSettingsSection;
window.viewHealthDetails = viewHealthDetails;
window.viewThreatTimeline = viewThreatTimeline;