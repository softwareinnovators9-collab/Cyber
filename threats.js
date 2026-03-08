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
// CyberShield CSWS — Threat Management Module
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
  
  threats: [
    { id: 1, uuid: 'threat-1', title: 'Suspicious Login Attempt', severity: 'high', category: 'intrusion', status: 'open', device_name: 'Server-01', detected_at: new Date().toISOString() },
    { id: 2, uuid: 'threat-2', title: 'Malware Detected', severity: 'critical', category: 'malware', status: 'open', device_name: 'Workstation-01', detected_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 3, uuid: 'threat-3', title: 'Phishing Email', severity: 'medium', category: 'phishing', status: 'investigating', device_name: 'Mobile-01', detected_at: new Date(Date.now() - 7200000).toISOString() }
  ],
  
  notifications: [
    { id: 1, title: 'New Threat Detected', message: 'High severity threat on Server-01', type: 'danger', is_read: false, created_at: new Date().toISOString() },
    { id: 2, title: 'Threat Assigned', message: 'Threat assigned to security team', type: 'success', is_read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 3, title: 'Threat Resolved', message: 'Malware threat successfully contained', type: 'success', is_read: true, created_at: new Date(Date.now() - 3600000).toISOString() }
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
function badgeSeverity(val) { return badge(val, ''); }
function badgeStatus(val) { return badge(val, ''); }

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

// ── App Core ──────────────────────────────────────────────────────────────
const App = {
  user: null,
  currentPage: 'threats',
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
    
    // Update threat badge
    document.getElementById('badge-threats').textContent = MockData.threats.length;
  },

  showLogin() {
    document.getElementById('page-login').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
  },

  showApp() {
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    App.navigate('threats');
    App.loadNotifications();
    App.notifInterval = setInterval(() => App.loadNotifications(), 30000);
    
    // Initialize notification badge
    setTimeout(() => {
      const badge = document.querySelector('.notification-dot');
      const unreadCount = MockData.notifications.filter(n => !n.is_read).length;
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
      case 'threats': App.loadThreats(); break;
      case 'dashboard': window.location.href = 'dashboard.html'; break;
      case 'devices': window.location.href = 'devices.html'; break;
      case 'incidents': window.location.href = 'incidents.html'; break;
      case 'audit': window.location.href = 'audit.html'; break;
      case 'users': window.location.href = 'users.html'; break;
    }
  },

  loadThreats() {
    const content = document.getElementById('page-threats');
    if (!content) return;
    
    content.innerHTML = `
        <div class="section-toolbar">
          <input type="text" class="search-input" placeholder="Search threats..." onkeyup="App.filterThreats(this.value)">
          <div class="filter-group">
            <select class="select-sm" onchange="App.filterBySeverity(this.value)">
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
            <tbody id="threatsTableBody">
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
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;
    panel.classList.toggle('open');
  },

  markNotificationRead(id) {
    const notif = MockData.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
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
          <option value="server-01">Server-01</option>
          <option value="workstation-01">Workstation-01</option>
          <option value="mobile-01">Mobile-01</option>
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
    const device = document.getElementById('threatDevice').value;
    const description = document.getElementById('threatDescription').value;
    
    if (!title || !category || !severity || !device) {
      Toast.show('Please fill in all required fields', 'error');
      return;
    }
    
    const newThreat = {
      id: MockData.threats.length + 1,
      uuid: `threat-${Date.now()}`,
      title: title,
      category: category,
      severity: severity,
      status: 'open',
      device_name: device,
      detected_at: new Date().toISOString(),
      description: description
    };
    
    MockData.threats.push(newThreat);
    Modal.close();
    App.loadThreats();
    Toast.show('Threat logged successfully', 'success');
    
    // Update badge
    document.getElementById('badge-threats').textContent = MockData.threats.length;
  },

  // Action functions
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

  filterThreats(search) { 
    const rows = document.querySelectorAll('#threatsTableBody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(search.toLowerCase()) ? '' : 'none';
    });
  },

  filterBySeverity(severity) { 
    const rows = document.querySelectorAll('#threatsTableBody tr');
    rows.forEach(row => {
      const severityCell = row.cells[2];
      if (!severity) {
        row.style.display = '';
      } else {
        const hasSeverity = severityCell.textContent.toLowerCase().includes(severity.toLowerCase());
        row.style.display = hasSeverity ? '' : 'none';
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
