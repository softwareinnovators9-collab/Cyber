// ────────────────────────────────────────────────────────────────────────────
// PAGE USAGE TRACKER
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
      stats[page] = {
        visits: 0,
        totalTimeMs: 0,
        lastVisit: new Date().toISOString(),
        loadTimes: [],
        averageLoadTime: 0
      };
    }

    stats[page].visits++;
    stats[page].lastVisit = new Date().toISOString();

    // Track page load time
    const loadStartTime = performance.now();
    window.addEventListener('load', () => {
      const loadTime = performance.now() - loadStartTime;
      stats[page].loadTimes.push(loadTime);
      stats[page].averageLoadTime = stats[page].loadTimes.reduce((a, b, i, arr) => a + b, 0) / stats[page].loadTimes.length;
      this.saveJSON(stats);

      console.log(`📄 ${page} loaded in ${loadTime.toFixed(2)}ms`);
    });

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

  // NEW: Get page load statistics
  getPageLoadStats() {
    const stats = this.loadJSON();
    const loadStats = {};

    Object.entries(stats).forEach(([page, data]) => {
      loadStats[page] = {
        visits: data.visits || 0,
        averageLoadTime: data.averageLoadTime || 0,
        lastLoadTime: data.loadTimes && data.loadTimes.length > 0 ? data.loadTimes[data.loadTimes.length - 1] : 0,
        loadTimes: data.loadTimes || [],
        fastestLoad: data.loadTimes && data.loadTimes.length > 0 ? Math.min(...data.loadTimes) : 0,
        slowestLoad: data.loadTimes && data.loadTimes.length > 0 ? Math.max(...data.loadTimes) : 0
      };
    });

    return loadStats;
  },

  // NEW: Show page load statistics in console
  showPageLoadStats() {
    const loadStats = this.getPageLoadStats();

    console.log('=== PAGE LOAD STATISTICS ===');
    Object.entries(loadStats).forEach(([page, stats]) => {
      console.log(`\n📊 ${page}:`);
      console.log(`  Visits: ${stats.visits}`);
      console.log(`  Average Load Time: ${stats.averageLoadTime.toFixed(2)}ms`);
      console.log(`  Last Load Time: ${stats.lastLoadTime.toFixed(2)}ms`);
      console.log(`  Fastest Load: ${stats.fastestLoad.toFixed(2)}ms`);
      console.log(`  Slowest Load: ${stats.slowestLoad.toFixed(2)}ms`);
      console.log(`  All Load Times: [${stats.loadTimes.map(t => t.toFixed(2)).join(', ')}ms]`);
    });
    console.log('============================');
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
    link.setAttribute('download', `cybershield-page-stats-${new Date().toISOString().slice(0, 10)}.json`);
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
// CyberShield CSWS — Incident Management Module
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

  incidents: [
    { id: 1, uuid: 'inc-1', title: 'Security Incident #1', severity: 'high', status: 'open', created_by_name: 'Admin User', created_at: new Date().toISOString() },
    { id: 2, uuid: 'inc-2', title: 'Data Breach Investigation', severity: 'critical', status: 'in_progress', created_by_name: 'Admin User', created_at: new Date(Date.now() - 86400000).toISOString() }
  ],

  notifications: [
    { id: 1, title: 'New Incident Created', message: 'High severity incident logged', type: 'danger', is_read: false, created_at: new Date().toISOString() },
    { id: 2, title: 'Incident Updated', message: 'Incident status changed to in-progress', type: 'success', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 3, title: 'Incident Resolved', message: 'Security incident successfully resolved', type: 'success', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() }
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
  return `<span class="badge badge-${prefix}${val}">${val.replace(/_/g, ' ')}</span>`;
}
function badgeSeverity(val) { return badge(val, ''); }
function badgeStatus(val) { return badge(val, ''); }

function timeAgo(dt) {
  if (!dt) return '—';
  const diff = Math.floor((Date.now() - new Date(dt)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dt).toLocaleDateString();
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString();
}

function escHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── App Core ──────────────────────────────────────────────────────────────
const App = {
  user: null,
  currentPage: 'incidents',
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

    // Update incident badge
    document.getElementById('badge-incidents').textContent = DataStore.getIncidents().length;
  },

  showLogin() {
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  },

  showApp() {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    App.navigate('incidents');
    App.loadNotifications();
    App.notifInterval = setInterval(() => App.loadNotifications(), 30000);

    // Initialize notification badge
    setTimeout(() => {
      const badge = document.querySelector('.notification-dot');
      const notifications = DataStore.getNotifications();
      const unreadCount = notifications.filter(n => !n.is_read).length;
      if (badge) {
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
      }
    }, 100);
  },

  navigate(page) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`page-${page}`);
    if (section) {
      section.classList.add('active');
      App.currentPage = page;
      document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
      document.querySelector(`[data-page="${page}"]`).classList.add('active');
      App.loadPage(page);
    }
  },

  async loadPage(page) {
    switch (page) {
      case 'incidents': App.loadIncidents(); break;
      case 'dashboard': window.location.href = 'dashboard.html'; break;
      case 'devices': window.location.href = 'devices.html'; break;
      case 'threats': window.location.href = 'threats.html'; break;
      case 'audit': window.location.href = 'audit.html'; break;
      case 'users': window.location.href = 'users.html'; break;
    }
  },

  loadIncidents() {
    const incidents = DataStore.getIncidents();
    const content = document.getElementById('page-incidents');
    if (!content) return;

    content.innerHTML = `
      <div class="section-toolbar">
        <input type="text" class="search-input" placeholder="Search incidents..." onkeyup="App.filterIncidents(this.value)">
        <div class="filter-group">
          <select class="select-sm" onchange="App.filterByStatus(this.value)">
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
          <tbody id="incidentsTableBody">
            ${incidents.map(i => `
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
  },

  loadNotifications() {
    const panel = document.getElementById('notificationsList');
    if (!panel) return;

    const notifications = DataStore.getNotifications();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    panel.innerHTML = notifications.map(n => `
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
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;
    panel.classList.toggle('open');
  },

  markNotificationRead(id) {
    const notifications = DataStore.getNotifications();
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      DataStore.saveNotifications(notifications);
      App.loadNotifications();
    }
  },

  toggleTheme() {
    // Simple theme toggle (can be expanded)
    document.body.classList.toggle('light-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
    }
  },

  login(email, password) {
    // Use DataStore for authentication
    const user = DataStore.authenticate(email, password);
    if (user) {
      App.setUser(user);
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
      id: DataStore.getIncidents().length + 1,
      uuid: `inc-${Date.now()}`,
      title: title,
      severity: severity,
      status: 'open',
      created_by_name: App.user.name,
      created_at: new Date().toISOString(),
      description: description,
      initial_actions: actions
    };

    DataStore.addIncident(newIncident);
    Modal.close();
    App.loadIncidents();
    Toast.show('Incident created successfully', 'success');

    // Update badge
    document.getElementById('badge-incidents').textContent = DataStore.getIncidents().length;
  },

  // Action functions
  viewIncident(uuid) {
    const incident = DataStore.getIncidents().find(i => i.uuid === uuid);
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
    const incident = DataStore.getIncidents().find(i => i.uuid === uuid);
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
    const incident = DataStore.getIncidents().find(i => i.uuid === uuid);
    if (incident) {
      incident.title = document.getElementById('editIncidentTitle').value;
      incident.severity = document.getElementById('editIncidentSeverity').value;
      incident.status = document.getElementById('editIncidentStatus').value;
      incident.description = document.getElementById('editIncidentDescription').value;
      DataStore.updateIncident(incident);

      Modal.close();
      App.loadIncidents();
      Toast.show('Incident updated successfully', 'success');
    }
  },

  filterIncidents(search) {
    const rows = document.querySelectorAll('#incidentsTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(search.toLowerCase()) ? '' : 'none';
    });
  },

  filterByStatus(status) {
    const rows = document.querySelectorAll('#incidentsTableBody tr');
    rows.forEach(row => {
      const statusCell = row.cells[2];
      if (!status) {
        row.style.display = '';
      } else {
        const hasStatus = statusCell.textContent.toLowerCase().includes(status.toLowerCase());
        row.style.display = hasStatus ? '' : 'none';
      }
    });
  }
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
