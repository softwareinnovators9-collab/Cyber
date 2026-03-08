/* eslint-disable */
/* @ts-ignore */
// ────────────────────────────────────────────────────────────────────────────
// PAGE USAGE TRACKER – Pure JSON Storage (GQM Metrics)
// Add this block to EVERY .js file (dashboard.js, audit.js, devices.js, etc.)
// ────────────────────────────────────────────────────────────────────────────
const PageTracker = {
  KEY: 'cybershield_page_stats',

  getPageName() {
    const title = document.title.toLowerCase();
    if (title.includes('dashboard')) return 'Dashboard';
    if (title.includes('audit')) return 'Audit Logs';
    if (title.includes('device')) return 'Devices';
    if (title.includes('incident')) return 'Incidents';
    if (title.includes('threat')) return 'Threats';
    if (title.includes('user')) return 'Users';
    return 'Landing Page';
  },

  init() {
    let stats = this.loadJSON();

    const page = this.getPageName();
    if (!stats[page]) {
      stats[page] = { visits: 0, totalTimeMs: 0, lastVisit: new Date().toISOString() };
    }

    stats[page].visits++;
    stats[page].lastVisit = new Date().toISOString();

    const startTime = performance.now();

    const save = () => {
      const timeSpent = Math.floor(performance.now() - startTime);
      stats[page].totalTimeMs += timeSpent;
      this.saveJSON(stats);
    };

    window.addEventListener('beforeunload', save);
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) save();
    });

    // Auto-save every 30 seconds
    setInterval(() => {
      if (performance.now() - startTime > 1000) save();
    }, 30000);

    this.saveJSON(stats); // initial save
  },

  loadJSON() {
    const raw = localStorage.getItem(this.KEY);
    return raw ? JSON.parse(raw) : {};
  },

  saveJSON(stats) {
    localStorage.setItem(this.KEY, JSON.stringify(stats, null, 2));
  },

  getAllStats() {
    return this.loadJSON();
  },

  // NEW: Export as downloadable JSON file
  exportJSON() {
    const stats = this.getAllStats();
    const dataStr = JSON.stringify(stats, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `cybershield-page-stats-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Toast.show('Stats exported as JSON!', 'success');
  },

  // NEW: Show raw JSON in modal
  showRawJSON() {
    const stats = this.getAllStats();
    const jsonString = JSON.stringify(stats, null, 2);
    
    Modal.open('Raw Page Stats JSON', `
      <pre style="background:#0f1318; padding:16px; border-radius:8px; overflow:auto; max-height:400px; font-family:monospace; font-size:13px; color:#94a3b8;">
${escHtml(jsonString)}
      </pre>
    `, ` 
      <button class="btn-secondary" onclick="Modal.close()">Close</button>
      <button class="btn-primary" onclick="PageTracker.exportJSON()">Download JSON</button>
    `, true);
  }
};

// ── Initialize on every page ──
document.addEventListener('DOMContentLoaded', () => {
  PageTracker.init();
  // ... your existing App.init() etc.
});

// ────────────────────────────────────────────────────────────────────────────
// CyberShield CSWS — Dashboard Module
// ────────────────────────────────────────────────────────────────────────────

'use strict';

// ── Mock Data ───────────────────────────────────────────────────────────────
const MockData = {
  user: {
    id: 1,
    uuid: 'admin-uuid',
    name: 'Admin User',
    email: 'admin@cybershield.io',
    role: 'admin'
  },
  
  devices: [
    { id: 1, uuid: 'dev-1', device_name: 'Server-01', device_type: 'server', ip_address: '192.168.1.100', status: 'online', risk_score: 25, owner_name: 'Admin User', open_threats: 2 },
    { id: 2, uuid: 'dev-2', device_name: 'Workstation-01', device_type: 'workstation', ip_address: '192.168.1.101', status: 'offline', risk_score: 45, owner_name: 'Admin User', open_threats: 0 },
    { id: 3, uuid: 'dev-3', device_name: 'Mobile-01', device_type: 'mobile', ip_address: '192.168.1.102', status: 'online', risk_score: 15, owner_name: 'Admin User', open_threats: 1 }
  ],
  
  threats: [
    { id: 1, uuid: 'threat-1', title: 'Suspicious Login Attempt', severity: 'high', category: 'intrusion', status: 'open', device_name: 'Server-01', detected_at: new Date().toISOString() },
    { id: 2, uuid: 'threat-2', title: 'Malware Detected', severity: 'critical', category: 'malware', status: 'open', device_name: 'Workstation-01', detected_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, uuid: 'threat-3', title: 'Phishing Email', severity: 'medium', category: 'phishing', status: 'investigating', device_name: 'Mobile-01', detected_at: new Date(Date.now() - 7200000).toISOString() }
  ],
  
  incidents: [
    { id: 1, uuid: 'inc-1', title: 'Security Incident #1', severity: 'high', status: 'open', created_by_name: 'Admin User', created_at: new Date().toISOString() },
    { id: 2, uuid: 'inc-2', title: 'Data Breach Investigation', severity: 'critical', status: 'in_progress', created_by_name: 'Admin User', created_at: new Date(Date.now() - 86400000).toISOString() }
  ],
  
  notifications: [
    { id: 1, title: 'New Threat Detected', message: 'High severity threat on Server-01', type: 'danger', is_read: false, created_at: new Date().toISOString() },
    { id: 2, title: 'Device Offline', message: 'Workstation-01 has gone offline', type: 'warning', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 3, title: 'System Update', message: 'Security definitions updated successfully', type: 'success', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() }
  ],
  
  users: [
    { id: 1, uuid: 'admin-uuid', name: 'Admin User', email: 'admin@cybershield.io', role: 'admin', status: 'active', created_at: new Date().toISOString() },
    { id: 2, uuid: 'user-2', name: 'John Analyst', email: 'john@cybershield.io', role: 'analyst', status: 'active', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 3, uuid: 'user-3', name: 'Jane Viewer', email: 'jane@cybershield.io', role: 'viewer', status: 'active', created_at: new Date(Date.now() - 172800000).toISOString() }
  ],
  
  auditLogs: [
    { id: 1, user_name: 'Admin User', action: 'login', resource: 'auth', ip_address: '192.168.1.1', status: 'success', created_at: new Date().toISOString() },
    { id: 2, user_name: 'Admin User', action: 'device_view', resource: 'devices', ip_address: '192.168.1.1', status: 'success', created_at: new Date(Date.now() - 600000).toISOString() }
  ]
};

// ── Toast ───────────────────────────────────────────────────────────────
const Toast = {
  show(msg, type = 'info', title = null) {
    const icons = { info: 'fa-circle-info', success: 'fa-circle-check', warning: 'fa-triangle-exclamation', error: 'fa-circle-xmark' };
    const titles = { info: 'Info', success: 'Success', warning: 'Warning', error: 'Error' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fas ${icons[type]} toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title || titles[type]}</div>
        <div class="toast-msg">${msg}</div>
      </div>`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  },
};

// ── Modal ───────────────────────────────────────────────────────────────
const Modal = {
  open(title, bodyHTML, footerHTML, wide = false) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '';
    document.getElementById('modal-box').classList.toggle('wide', wide);
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() { document.getElementById('modal-overlay').classList.add('hidden'); },
};
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) Modal.close();
});

// ── Helpers ─────────────────────────────────────────────────────────────
function badge(val, prefix = '') {
  if (!val) return '<span class="mono" style="color:var(--text-3)">—</span>';
  return `<span class="badge badge-${prefix}${val}">${val.replace(/_/g,' ')}</span>`;
}
function badgeStatus(val) { return badge(val, ''); }
function badgeSeverity(val) { return badge(val, ''); }

function dot(status) {
  return `<span class="status-dot dot-${status}"></span>`;
}

function timeAgo(dt) {
  if (!dt) return '—';
  const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(dt).toLocaleDateString();
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function riskBar(score) {
  const color = score >= 80 ? 'var(--red)' : score >= 50 ? 'var(--orange)' : score >= 20 ? 'var(--yellow)' : 'var(--green)';
  return `<div class="risk-bar">
    <div class="risk-track"><div class="risk-fill" style="width:${score}%;background:${color}"></div></div>
    <span class="risk-label">${score}</span>
  </div>`;
}

function emptyState(icon, text) {
  return `<div class="empty-state"><i class="fas ${icon}"></i><p>${text}</p></div>`;
}

// ── App Core ──────────────────────────────────────────────────────────────
const App = {
  user: null,
  currentPage: 'dashboard',
  notifInterval: null,

  init() {
    // Check stored session
    const storedUser = localStorage.getItem('csws_user');
    if (storedUser) {
      App.setUser(JSON.parse(storedUser));
      App.showApp();
      return;
    }
    App.showLogin();
  },

  setUser(user) {
    App.user = user;
    localStorage.setItem('csws_user', JSON.stringify(user));
    
    // Sidebar user info
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('sidebarUser').innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div><div class="user-name">${escHtml(user.name)}</div><div class="user-role">${user.role}</div></div>`;
    
    // Show/hide role-gated elements
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', user.role !== 'admin'));
    document.querySelectorAll('.analyst-only').forEach(el => el.classList.toggle('hidden', !['admin','analyst'].includes(user.role)));
  },

  showLogin() {
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  },

  showApp() {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    App.navigate('dashboard');
    App.loadNotifications();
    App.notifInterval = setInterval(() => App.loadNotifications(), 30000);
    
    // Initialize notification badge
    setTimeout(() => {
      const badge = document.querySelector('.notification-dot');
      const unreadCount = MockData.notifications.filter(n => !n.is_read).length;
      if (badge) {
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
        console.log('Notification badge initialized, unread count:', unreadCount);
      }
    }, 100);
  },

  navigate(page) {
    console.log('Navigating to:', page);
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`page-${page}`);
    console.log('Section found:', section);
    if (section) {
      section.classList.add('active');
      App.currentPage = page;
      document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
      const navItem = document.querySelector(`[data-page="${page}"]`);
      if (navItem) {
        navItem.classList.add('active');
      }
      App.loadPage(page);
    } else {
      console.error('Section not found:', `page-${page}`);
    }
  },

  async loadPage(page) {
    console.log('Loading page content for:', page);
    switch (page) {
      case 'dashboard': App.loadDashboard(); break;
      case 'devices': App.loadDevices(); break;
      case 'threats': App.loadThreats(); break;
      case 'incidents': App.loadIncidents(); break;
      case 'audit': App.loadAuditLogs(); break;
      case 'users': App.loadUsers(); break;
      default: console.error('Unknown page:', page);
    }
  },

  loadDashboard() {
    console.log('Loading dashboard...');
    const content = document.getElementById('page-dashboard');
    if (!content) {
      console.error('Dashboard container not found!');
      return;
    }
    content.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card info">
            <div class="stat-icon"><i class="fas fa-server"></i></div>
            <div class="stat-value">${MockData.devices.length}</div>
            <div class="stat-label">Total Devices</div>
            <div class="stat-sub">${MockData.devices.filter(d => d.status === 'online').length} online</div>
          </div>
          <div class="stat-card danger">
            <div class="stat-icon"><i class="fas fa-bug"></i></div>
            <div class="stat-value">${MockData.threats.length}</div>
            <div class="stat-label">Active Threats</div>
            <div class="stat-sub">${MockData.threats.filter(t => t.severity === 'critical').length} critical</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-icon"><i class="fas fa-fire-flame-curved"></i></div>
            <div class="stat-value">${MockData.incidents.length}</div>
            <div class="stat-label">Open Incidents</div>
            <div class="stat-sub">${MockData.incidents.filter(i => i.status === 'open').length} pending</div>
          </div>
          <div class="stat-card info">
            <div class="stat-icon"><i class="fas fa-shield-halved"></i></div>
            <div class="stat-value">98%</div>
            <div class="stat-label">Security Score</div>
            <div class="stat-sub">Excellent</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card chart-card">
            <div class="card-header">
              <h3>Threat Trend (14 days)</h3>
            </div>
            <canvas id="threatChart" width="400" height="200"></canvas>
          </div>
          <div class="card chart-card sm">
            <div class="card-header">
              <h3>Severity Distribution</h3>
            </div>
            <canvas id="severityChart" width="300" height="200"></canvas>
          </div>
        </div>

        <div class="tables-grid">
          <div class="card">
            <div class="card-header">
              <h3>Recent Threats</h3>
              <a href="#" class="text-link" onclick="App.navigate('threats')">View All</a>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Threat</th>
                  <th>Severity</th>
                  <th>Device</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>
                  ${MockData.threats.slice(0, 5).map(t => `
                    <tr>
                      <td>${escHtml(t.title)}</td>
                      <td>${badgeSeverity(t.severity)}</td>
                      <td>${escHtml(t.device_name)}</td>
                      <td>${timeAgo(t.detected_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="card">
            <div class="card-header">
              <h3>Recent Incidents</h3>
              <a href="#" class="text-link" onclick="App.navigate('incidents')">View All</a>
            </div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr></thead>
                <tbody>
                  ${MockData.incidents.slice(0, 5).map(i => `
                    <tr>
                      <td>${escHtml(i.title)}</td>
                      <td>${badgeSeverity(i.severity)}</td>
                      <td>${badgeStatus(i.status)}</td>
                      <td>${timeAgo(i.created_at)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        // JSON-Powered Page Usage Analytics (GQM Metrics)
        const stats = PageTracker.getAllStats();

        let analyticsHTML = '<div class="card" style="margin-top:24px;">';
        analyticsHTML += '<div class="card-header">';
        analyticsHTML += '<h3>📊 Page Usage Analytics – JSON Tracked</h3>';
        analyticsHTML += '<div>';
        analyticsHTML += '<button class="btn-secondary btn-sm" onclick="PageTracker.showRawJSON()">View Raw JSON</button>';
        analyticsHTML += '<button class="btn-primary btn-sm" onclick="PageTracker.exportJSON()">Export JSON</button>';
        analyticsHTML += '</div>';
        analyticsHTML += '</div>';
        analyticsHTML += '<div class="table-wrap">';
        analyticsHTML += '<table class="data-table">';
        analyticsHTML += '<thead><tr>';
        analyticsHTML += '<th>Page</th>';
        analyticsHTML += '<th>Visits</th>';
        analyticsHTML += '<th>Total Time</th>';
        analyticsHTML += '<th>Avg Time / Visit</th>';
        analyticsHTML += '<th>Last Visit</th>';
        analyticsHTML += '</tr></thead>';
        analyticsHTML += '<tbody>';
        
        Object.entries(stats).forEach(([page, data]) => {
          analyticsHTML += '<tr>';
          analyticsHTML += '<td><strong>' + page + '</strong></td>';
          analyticsHTML += '<td>' + data.visits + '</td>';
          analyticsHTML += '<td>' + (data.totalTimeMs / 60000).toFixed(1) + ' min</td>';
          analyticsHTML += '<td>' + (data.visits ? (data.totalTimeMs / data.visits / 60000).toFixed(1) : 0) + ' min</td>';
          analyticsHTML += '<td class="mono">' + new Date(data.lastVisit).toLocaleString() + '</td>';
          analyticsHTML += '</tr>';
        });
        
        analyticsHTML += '</tbody>';
        analyticsHTML += '</table>';
        analyticsHTML += '</div>';
        analyticsHTML += '</div>';
        
        content.innerHTML += analyticsHTML;

    // Initialize charts
    setTimeout(() => {
      App.initThreatChart();
      App.initSeverityChart();
    }, 100);
    console.log('Dashboard loaded successfully');
  },

  initThreatChart() {
    const ctx = document.getElementById('threatChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({length: 14}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (13 - i));
          return date.toLocaleDateString();
        }),
        datasets: [{
          label: 'Threats Detected',
          data: Array.from({length: 14}, () => Math.floor(Math.random() * 10) + 2),
          borderColor: '#00d4ff',
          backgroundColor: '#00d4ff18',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#1f2d3d' }, ticks: { color: '#94a3b8' } },
          x: { grid: { color: '#1f2d3d' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  },

  initSeverityChart() {
    const ctx = document.getElementById('severityChart');
    if (!ctx) return;
    
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [1, 2, 3, 4],
          backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#e2e8f0' } }
        }
      }
    });
  },

  loadDevices() {
    console.log('Loading devices...');
    const content = document.getElementById('page-devices');
    if (!content) {
      console.error('Devices container not found!');
      return;
    }
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search devices..." onkeyup="App.filterDevices(this.value)">
          <div class="filter-group">
            <select class="select-sm" onchange="App.filterByStatus(this.value)">
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="quarantined">Quarantined</option>
            </select>
          </div>
          <button class="btn-primary btn-sm" onclick="App.showAddDeviceModal()">
            <i class="fas fa-plus"></i> Add Device
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Device</th>
              <th>Type</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Risk Score</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr></thead>
            <tbody id="devicesTableBody">
              ${MockData.devices.map(d => `
                <tr>
                  <td><strong>${escHtml(d.device_name)}</strong></td>
                  <td>${escHtml(d.device_type)}</td>
                  <td class="mono">${escHtml(d.ip_address)}</td>
                  <td>${dot(d.status)} ${badgeStatus(d.status)}</td>
                  <td>${riskBar(d.risk_score)}</td>
                  <td>${escHtml(d.owner_name)}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" onclick="App.viewDevice('${d.uuid}')">View</button>
                      <button class="action-btn red" onclick="App.quarantineDevice('${d.uuid}')">Quarantine</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
    console.log('Devices loaded successfully');
  },

  loadThreats() {
    console.log('Loading threats...');
    const content = document.getElementById('page-threats');
    if (!content) {
      console.error('Threats container not found!');
      return;
    }
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search threats...">
          <div class="filter-group">
            <select class="select-sm">
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <button class="btn-primary btn-sm" onclick="App.showAddThreatModal()">
            <i class="fas fa-plus"></i> Log Threat
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Threat</th>
              <th>Category</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Device</th>
              <th>Detected</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${MockData.threats.map(t => `
                <tr>
                  <td><strong>${escHtml(t.title)}</strong></td>
                  <td>${escHtml(t.category)}</td>
                  <td>${badgeSeverity(t.severity)}</td>
                  <td>${badgeStatus(t.status)}</td>
                  <td>${escHtml(t.device_name)}</td>
                  <td>${timeAgo(t.detected_at)}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" onclick="App.viewThreat('${t.uuid}')">View</button>
                      <button class="action-btn" onclick="App.assignThreat('${t.uuid}')">Assign</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
    console.log('Threats loaded successfully');
  },

  loadIncidents() {
    console.log('Loading incidents...');
    const content = document.getElementById('page-incidents');
    if (!content) {
      console.error('Incidents container not found!');
      return;
    }
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search incidents...">
          <div class="filter-group">
            <select class="select-sm">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <button class="btn-primary btn-sm" onclick="App.showAddIncidentModal()">
            <i class="fas fa-plus"></i> Create Incident
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Incident</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Created By</th>
              <th>Created</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${MockData.incidents.map(i => `
                <tr>
                  <td><strong>${escHtml(i.title)}</strong></td>
                  <td>${badgeSeverity(i.severity)}</td>
                  <td>${badgeStatus(i.status)}</td>
                  <td>${escHtml(i.created_by_name)}</td>
                  <td>${timeAgo(i.created_at)}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" onclick="App.viewIncident('${i.uuid}')">View</button>
                      <button class="action-btn" onclick="App.editIncident('${i.uuid}')">Edit</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
    console.log('Incidents loaded successfully');
  },

  loadAuditLogs() {
    console.log('Loading audit logs...');
    const content = document.getElementById('page-audit');
    if (!content) {
      console.error('Audit logs container not found!');
      return;
    }
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search audit logs...">
          <div class="filter-group">
            <select class="select-sm">
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="device_view">Device View</option>
              <option value="threat_create">Threat Create</option>
            </select>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Time</th>
            </tr></thead>
            <tbody>
              ${MockData.auditLogs.map(a => `
                <tr>
                  <td>${escHtml(a.user_name)}</td>
                  <td>${escHtml(a.action)}</td>
                  <td>${escHtml(a.resource)}</td>
                  <td class="mono">${escHtml(a.ip_address)}</td>
                  <td>${badge(a.status)}</td>
                  <td>${timeAgo(a.created_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
    console.log('Audit logs loaded successfully');
  },

  loadUsers() {
    console.log('Loading users...');
    const content = document.getElementById('page-users');
    if (!content) {
      console.error('Users container not found!');
      return;
    }
    
    // Initialize users array if it doesn't exist
    if (!MockData.users) {
      MockData.users = [MockData.user];
    }
    
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search users...">
          <div class="filter-group">
            <select class="select-sm">
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button class="btn-primary btn-sm" onclick="App.showAddUserModal()">
            <i class="fas fa-plus"></i> Add User
          </button>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${MockData.users.map(u => `
                <tr>
                  <td><strong>${escHtml(u.name)}</strong></td>
                  <td>${escHtml(u.email)}</td>
                  <td>${badge(u.role)}</td>
                  <td>${badge('success')}</td>
                  <td>${timeAgo(u.created_at)}</td>
                  <td>
                    <div class="actions">
                      <button class="action-btn" onclick="App.editUser('${u.uuid}')">Edit</button>
                      ${u.uuid !== MockData.user.uuid ? `<button class="action-btn red" onclick="App.deleteUser('${u.uuid}')">Delete</button>` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
    `;
    console.log('Users loaded successfully');
  },

  loadNotifications() {
    const panel = document.getElementById('notificationsList');
    if (!panel) return;
    
    const unreadCount = MockData.notifications.filter(n => !n.is_read).length;
    
    panel.innerHTML = MockData.notifications.map(n => `
      <div class="notif-item ${!n.is_read ? 'unread' : ''}" onclick="App.markNotificationRead(${n.id})">
        <div class="notif-dot ${n.type}"></div>
        <div class="notif-text">
          <div class="notif-title">${escHtml(n.title)}</div>
          <div class="notif-msg">${escHtml(n.message)}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>
    `).join('');

    // Update notification badge
    const badge = document.querySelector('.notification-dot');
    if (badge) {
      badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  },

  toggleNotifications() {
    console.log('Toggling notifications panel...');
    const panel = document.getElementById('notificationsPanel');
    if (!panel) {
      console.error('Notifications panel not found!');
      return;
    }
    panel.classList.toggle('open');
    console.log('Notifications panel toggled, open:', panel.classList.contains('open'));
  },

  markNotificationRead(id) {
    const notif = MockData.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      App.loadNotifications();
    }
  },

  toggleTheme() {
    console.log('Toggling theme...');
    // Simple theme toggle (can be expanded)
    document.body.classList.toggle('light-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
      console.log('Theme toggled, light-theme:', document.body.classList.contains('light-theme'));
    } else {
      console.error('Theme icon not found!');
    }
  },

  login(email, password) {
    // Simple mock authentication
    if (email === 'admin@cybershield.io' && password === 'Admin@CyberShield1') {
      App.setUser(MockData.user);
      App.showApp();
      Toast.show('Login successful', 'success');
      return true;
    } else {
      Toast.show('Invalid credentials', 'error');
      return false;
    }
  },

  logout() {
    localStorage.removeItem('csws_user');
    App.user = null;
    clearInterval(App.notifInterval);
    App.showLogin();
    Toast.show('Logged out successfully', 'info');
  },

  // Modal functions
  showAddDeviceModal() {
    Modal.open('Add Device', `
      <div class="form-group">
        <label>Device Name</label>
        <input type="text" id="deviceName" placeholder="Enter device name">
      </div>
      <div class="form-group">
        <label>Device Type</label>
        <select id="deviceType">
          <option value="server">Server</option>
          <option value="workstation">Workstation</option>
          <option value="mobile">Mobile</option>
          <option value="router">Router</option>
          <option value="iot">IoT Device</option>
        </select>
      </div>
      <div class="form-group">
        <label>IP Address</label>
        <input type="text" id="deviceIP" placeholder="192.168.1.100">
      </div>
      <div class="form-group">
        <label>Owner</label>
        <input type="text" id="deviceOwner" placeholder="Device owner name">
      </div>
    `, `
      <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
      <button class="btn-primary" onclick="App.addDevice()">Add Device</button>
    `);
  },

  addDevice() {
    const name = document.getElementById('deviceName').value;
    const type = document.getElementById('deviceType').value;
    const ip = document.getElementById('deviceIP').value;
    const owner = document.getElementById('deviceOwner').value || App.user.name;
    
    if (!name || !ip) {
      Toast.show('Please fill in device name and IP address', 'error');
      return;
    }
    
    const newDevice = {
      id: MockData.devices.length + 1,
      uuid: `dev-${Date.now()}`,
      device_name: name,
      device_type: type,
      ip_address: ip,
      status: 'online',
      risk_score: Math.floor(Math.random() * 50),
      owner_name: owner,
      open_threats: 0
    };
    
    MockData.devices.push(newDevice);
    Modal.close();
    App.loadDevices(); // Refresh the devices list
    Toast.show('Device added successfully', 'success');
    
    // Update badge
    document.getElementById('badge-devices').textContent = MockData.devices.length;
  },

  showAddThreatModal() {
    Modal.open('Log Threat', `
      <div class="form-group">
        <label>Threat Title</label>
        <input type="text" id="threatTitle" placeholder="Enter threat title">
      </div>
      <div class="form-group">
        <label>Category</label>
        <select id="threatCategory">
          <option value="malware">Malware</option>
          <option value="phishing">Phishing</option>
          <option value="intrusion">Intrusion</option>
          <option value="ddos">DDoS Attack</option>
          <option value="data_breach">Data Breach</option>
          <option value="social_engineering">Social Engineering</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Severity</label>
        <select id="threatSeverity">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label>Device</label>
        <select id="threatDevice">
          ${MockData.devices.map(d => `<option value="${d.uuid}">${d.device_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="threatDescription" placeholder="Describe the threat details..."></textarea>
      </div>
    `, `
      <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
      <button class="btn-primary" onclick="App.addThreat()">Log Threat</button>
    `);
  },

  addThreat() {
    const title = document.getElementById('threatTitle').value;
    const category = document.getElementById('threatCategory').value;
    const severity = document.getElementById('threatSeverity').value;
    const deviceUuid = document.getElementById('threatDevice').value;
    const description = document.getElementById('threatDescription').value;
    
    if (!title || !category || !severity || !deviceUuid) {
      Toast.show('Please fill in all required fields', 'error');
      return;
    }
    
    const device = MockData.devices.find(d => d.uuid === deviceUuid);
    const newThreat = {
      id: MockData.threats.length + 1,
      uuid: `threat-${Date.now()}`,
      title: title,
      category: category,
      severity: severity,
      status: 'open',
      device_name: device ? device.device_name : 'Unknown Device',
      detected_at: new Date().toISOString(),
      description: description
    };
    
    MockData.threats.push(newThreat);
    Modal.close();
    App.loadThreats(); // Refresh the threats list
    Toast.show('Threat logged successfully', 'success');
    
    // Update badge
    document.getElementById('badge-threats').textContent = MockData.threats.length;
  },

  showAddIncidentModal() {
    Modal.open('Create Incident', `
      <div class="form-group">
        <label>Incident Title</label>
        <input type="text" id="incidentTitle" placeholder="Enter incident title">
      </div>
      <div class="form-group">
        <label>Severity</label>
        <select id="incidentSeverity">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="incidentDescription" placeholder="Describe the incident details..."></textarea>
      </div>
      <div class="form-group">
        <label>Initial Actions Taken</label>
        <textarea id="incidentActions" placeholder="Describe immediate actions taken..."></textarea>
      </div>
    `, `
      <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
      <button class="btn-primary" onclick="App.addIncident()">Create Incident</button>
    `);
  },

  addIncident() {
    const title = document.getElementById('incidentTitle').value;
    const severity = document.getElementById('incidentSeverity').value;
    const description = document.getElementById('incidentDescription').value;
    const actions = document.getElementById('incidentActions').value;
    
    if (!title || !severity) {
      Toast.show('Please fill in title and severity', 'error');
      return;
    }
    
    const newIncident = {
      id: MockData.incidents.length + 1,
      uuid: `inc-${Date.now()}`,
      title: title,
      severity: severity,
      status: 'open',
      created_by_name: App.user.name,
      created_at: new Date().toISOString(),
      description: description,
      initial_actions: actions
    };
    
    MockData.incidents.push(newIncident);
    Modal.close();
    App.loadIncidents(); // Refresh the incidents list
    Toast.show('Incident created successfully', 'success');
    
    // Update badge
    document.getElementById('badge-incidents').textContent = MockData.incidents.length;
  },

  showAddUserModal() {
    Modal.open('Add User', `
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="userName" placeholder="Enter full name">
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" id="userEmail" placeholder="Enter email address">
      </div>
      <div class="form-group">
        <label>Role</label>
        <select id="userRole">
          <option value="viewer">Viewer</option>
          <option value="analyst">Analyst</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="userPassword" placeholder="Enter password">
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <input type="password" id="userConfirmPassword" placeholder="Confirm password">
      </div>
    `, `
      <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
      <button class="btn-primary" onclick="App.addUser()">Add User</button>
    `);
  },

  addUser() {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value;
    const confirmPassword = document.getElementById('userConfirmPassword').value;
    
    if (!name || !email || !role || !password) {
      Toast.show('Please fill in all required fields', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      Toast.show('Passwords do not match', 'error');
      return;
    }
    
    if (password.length < 8) {
      Toast.show('Password must be at least 8 characters', 'error');
      return;
    }
    
    const newUser = {
      id: MockData.users ? MockData.users.length + 1 : 2,
      uuid: `user-${Date.now()}`,
      name: name,
      email: email,
      role: role,
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    // Initialize users array if it doesn't exist
    if (!MockData.users) {
      MockData.users = [MockData.user];
    }
    
    MockData.users.push(newUser);
    Modal.close();
    App.loadUsers(); // Refresh the users list
    Toast.show('User added successfully', 'success');
  },

  // Action functions
  viewDevice(uuid) {
    const device = MockData.devices.find(d => d.uuid === uuid);
    if (device) {
      Modal.open('Device Details', `
        <div class="detail-grid">
          <div class="detail-field">
            <label>Device Name</label>
            <div class="val">${escHtml(device.device_name)}</div>
          </div>
          <div class="detail-field">
            <label>Type</label>
            <div class="val">${escHtml(device.device_type)}</div>
          </div>
          <div class="detail-field">
            <label>IP Address</label>
            <div class="val">${escHtml(device.ip_address)}</div>
          </div>
          <div class="detail-field">
            <label>Status</label>
            <div class="val">${dot(device.status)} ${badgeStatus(device.status)}</div>
          </div>
          <div class="detail-field">
            <label>Risk Score</label>
            <div class="val">${riskBar(device.risk_score)}</div>
          </div>
          <div class="detail-field">
            <label>Owner</label>
            <div class="val">${escHtml(device.owner_name)}</div>
          </div>
          <div class="detail-field full">
            <label>Open Threats</label>
            <div class="val">${device.open_threats}</div>
          </div>
        </div>
      `, `
        <button class="btn-secondary" onclick="Modal.close()">Close</button>
      `);
    }
  },

  quarantineDevice(uuid) {
    const device = MockData.devices.find(d => d.uuid === uuid);
    if (device) {
      device.status = device.status === 'quarantined' ? 'online' : 'quarantined';
      App.loadDevices();
      Toast.show(`Device ${device.device_name} ${device.status === 'quarantined' ? 'quarantined' : 'released from quarantine'}`, 'warning');
    }
  },

  viewThreat(uuid) {
    const threat = MockData.threats.find(t => t.uuid === uuid);
    if (threat) {
      Modal.open('Threat Details', `
        <div class="detail-grid">
          <div class="detail-field">
            <label>Title</label>
            <div class="val">${escHtml(threat.title)}</div>
          </div>
          <div class="detail-field">
            <label>Category</label>
            <div class="val">${escHtml(threat.category)}</div>
          </div>
          <div class="detail-field">
            <label>Severity</label>
            <div class="val">${badgeSeverity(threat.severity)}</div>
          </div>
          <div class="detail-field">
            <label>Status</label>
            <div class="val">${badgeStatus(threat.status)}</div>
          </div>
          <div class="detail-field">
            <label>Device</label>
            <div class="val">${escHtml(threat.device_name)}</div>
          </div>
          <div class="detail-field">
            <label>Detected</label>
            <div class="val">${formatDate(threat.detected_at)}</div>
          </div>
          ${threat.description ? `
            <div class="detail-field full">
              <label>Description</label>
              <div class="val">${escHtml(threat.description)}</div>
            </div>
          ` : ''}
        </div>
      `, `
        <button class="btn-secondary" onclick="Modal.close()">Close</button>
        <button class="btn-primary" onclick="App.assignThreat('${uuid}')">Assign to Me</button>
      `);
    }
  },

  assignThreat(uuid) {
    const threat = MockData.threats.find(t => t.uuid === uuid);
    if (threat) {
      threat.status = 'investigating';
      App.loadThreats();
      Toast.show(`Threat "${threat.title}" assigned to you`, 'success');
    }
  },

  viewIncident(uuid) {
    const incident = MockData.incidents.find(i => i.uuid === uuid);
    if (incident) {
      Modal.open('Incident Details', `
        <div class="detail-grid">
          <div class="detail-field">
            <label>Title</label>
            <div class="val">${escHtml(incident.title)}</div>
          </div>
          <div class="detail-field">
            <label>Severity</label>
            <div class="val">${badgeSeverity(incident.severity)}</div>
          </div>
          <div class="detail-field">
            <label>Status</label>
            <div class="val">${badgeStatus(incident.status)}</div>
          </div>
          <div class="detail-field">
            <label>Created By</label>
            <div class="val">${escHtml(incident.created_by_name)}</div>
          </div>
          <div class="detail-field">
            <label>Created</label>
            <div class="val">${formatDate(incident.created_at)}</div>
          </div>
          ${incident.description ? `
            <div class="detail-field full">
              <label>Description</label>
              <div class="val">${escHtml(incident.description)}</div>
            </div>
          ` : ''}
          ${incident.initial_actions ? `
            <div class="detail-field full">
              <label>Initial Actions</label>
              <div class="val">${escHtml(incident.initial_actions)}</div>
            </div>
          ` : ''}
        </div>
      `, `
        <button class="btn-secondary" onclick="Modal.close()">Close</button>
        <button class="btn-primary" onclick="App.editIncident('${uuid}')">Edit Incident</button>
      `);
    }
  },

  editIncident(uuid) {
    const incident = MockData.incidents.find(i => i.uuid === uuid);
    if (incident) {
      Modal.open('Edit Incident', `
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="editIncidentTitle" value="${escHtml(incident.title)}">
        </div>
        <div class="form-group">
          <label>Severity</label>
          <select id="editIncidentSeverity">
            <option value="low" ${incident.severity === 'low' ? 'selected' : ''}>Low</option>
            <option value="medium" ${incident.severity === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="high" ${incident.severity === 'high' ? 'selected' : ''}>High</option>
            <option value="critical" ${incident.severity === 'critical' ? 'selected' : ''}>Critical</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="editIncidentStatus">
            <option value="open" ${incident.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${incident.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${incident.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="editIncidentDescription">${escHtml(incident.description || '')}</textarea>
        </div>
      `, `
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="App.updateIncident('${uuid}')">Update Incident</button>
      `);
    }
  },

  updateIncident(uuid) {
    const incident = MockData.incidents.find(i => i.uuid === uuid);
    if (incident) {
      incident.title = document.getElementById('editIncidentTitle').value;
      incident.severity = document.getElementById('editIncidentSeverity').value;
      incident.status = document.getElementById('editIncidentStatus').value;
      incident.description = document.getElementById('editIncidentDescription').value;
      
      Modal.close();
      App.loadIncidents();
      Toast.show('Incident updated successfully', 'success');
    }
  },

  editUser(uuid) {
    const user = MockData.users.find(u => u.uuid === uuid);
    if (user) {
      Modal.open('Edit User', `
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" id="editUserName" value="${escHtml(user.name)}">
        </div>
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="editUserEmail" value="${escHtml(user.email)}">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="editUserRole">
            <option value="viewer" ${user.role === 'viewer' ? 'selected' : ''}>Viewer</option>
            <option value="analyst" ${user.role === 'analyst' ? 'selected' : ''}>Analyst</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
      `, `
        <button class="btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn-primary" onclick="App.updateUser('${uuid}')">Update User</button>
      `);
    }
  },

  updateUser(uuid) {
    const user = MockData.users.find(u => u.uuid === uuid);
    if (user) {
      user.name = document.getElementById('editUserName').value;
      user.email = document.getElementById('editUserEmail').value;
      user.role = document.getElementById('editUserRole').value;
      
      Modal.close();
      App.loadUsers();
      Toast.show('User updated successfully', 'success');
    }
  },

  deleteUser(uuid) {
    const user = MockData.users.find(u => u.uuid === uuid);
    if (user && user.uuid !== MockData.user.uuid) {
      const index = MockData.users.findIndex(u => u.uuid === uuid);
      MockData.users.splice(index, 1);
      App.loadUsers();
      Toast.show(`User "${user.name}" deleted successfully`, 'warning');
    } else {
      Toast.show('Cannot delete your own account', 'error');
    }
  },

  filterDevices(search) { console.log('Filtering devices:', search); },
  filterByStatus(status) { console.log('Filtering by status:', status); }
};

// ── Event Listeners ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Initialize app
  App.init();

  // Login form
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    App.login(email, password);
  });

  // Setup navigation after app is initialized
  setTimeout(() => {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        if (page) App.navigate(page);
      });
    });
  }, 100);

  // Mobile menu toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Sidebar close
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
  });

  // Close notifications panel when clicking outside
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notificationsPanel');
    const notifBtn = e.target.closest('.btn-icon[onclick*="toggleNotifications"]');
    if (panel && !panel.contains(e.target) && !notifBtn) {
      panel.classList.remove('open');
      console.log('Notifications panel closed by clicking outside');
    }
  });
});

// ── Utility Functions ─────────────────────────────────────────────────────
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const icon = input.nextElementSibling.querySelector('i');
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}
