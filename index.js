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
    
    alert('Stats exported as JSON!');
  },

  // NEW: Show raw JSON in modal
  showRawJSON() {
    const stats = this.getAllStats();
    const jsonString = JSON.stringify(stats, null, 2);
    
    alert('Raw Page Stats JSON:\n\n' + jsonString);
  }
};

// ── Initialize on every page ──
document.addEventListener('DOMContentLoaded', () => {
  PageTracker.init();
  // ... your existing App.init() etc.
});

// ────────────────────────────────────────────────────────────────────────────
// CyberShield — Index Page JavaScript
// ────────────────────────────────────────────────────────────────────────────

'use strict';

// ── Navigation Functions ─────────────────────────────────────────────────────
function navigateToSection(section) {
  const sectionMap = {
    'dashboard': 'dashboard.html',
    'devices': 'devices.html',
    'threats': 'threats.html',
    'incidents': 'incidents.html',
    'audit': 'audit.html',
    'users': 'users.html'
  };
  
  const targetUrl = sectionMap[section];
  if (targetUrl) {
    window.location.href = targetUrl;
  }
}

// ── Modal Functions ───────────────────────────────────────────────────────────
function showInfo() {
  const features = [
    '🔒 Advanced threat detection and prevention',
    '📊 Real-time security monitoring and analytics',
    '🖥️ Comprehensive device management',
    '🚨 Automated incident response workflows',
    '📋 Detailed audit logging and compliance',
    '👥 Multi-user role-based access control',
    '🌐 Network security monitoring',
    '🔍 Vulnerability assessment and scanning',
    '📈 Security metrics and reporting',
    '⚡ Real-time alerts and notifications'
  ];
  
  const message = features.join('\n');
  
  // Create modal
  const modal = createModal('CyberShield Features', message);
  
  // Add buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'margin-top: 20px; display: flex; gap: 12px;';
  
  const quickStartBtn = document.createElement('button');
  quickStartBtn.textContent = 'Quick Start';
  quickStartBtn.className = 'btn-primary';
  quickStartBtn.style.flex = '1';
  quickStartBtn.onclick = quickStart;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.className = 'btn-secondary';
  closeBtn.style.flex = '1';
  closeBtn.onclick = () => {
    modal.remove();
    document.getElementById('overlay').remove();
  };
  
  buttonContainer.appendChild(quickStartBtn);
  buttonContainer.appendChild(closeBtn);
  modal.appendChild(buttonContainer);
  
  // Create and show overlay
  createOverlay();
  
  // Add modal to page
  document.body.appendChild(modal);
}

function quickStart() {
  // Close modal
  const modal = document.querySelector('[style*="position: fixed"]');
  const overlay = document.getElementById('overlay');
  if (modal) modal.remove();
  if (overlay) overlay.remove();
  
  // Navigate to dashboard
  window.location.href = 'dashboard.html';
}

function createModal(title, content) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--bg-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
    max-width: 450px;
    z-index: 1000;
    box-shadow: var(--shadow);
  `;
  
  modal.innerHTML = `
    <h3 style="margin-bottom: 16px; color: var(--text); font-family: var(--mono);">${title}</h3>
    <div style="color: var(--text-2); font-size: 14px; line-height: 1.6; white-space: pre-line;">${content}</div>
  `;
  
  return modal;
}

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 999;
  `;
  overlay.onclick = () => {
    const modal = document.querySelector('[style*="position: fixed"]');
    if (modal) modal.remove();
    overlay.remove();
  };
  
  document.body.appendChild(overlay);
}

// ── Auto-redirect Timer ─────────────────────────────────────────────────────
let redirectTimer;

function startRedirectTimer() {
  redirectTimer = setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 30000);
}

function resetRedirectTimer() {
  clearTimeout(redirectTimer);
  startRedirectTimer();
}

// ── Keyboard Navigation ─────────────────────────────────────────────────────
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Number keys 1-6 for quick navigation
    if (e.key >= '1' && e.key <= '6') {
      const sections = ['dashboard', 'devices', 'threats', 'incidents', 'audit', 'users'];
      const index = parseInt(e.key) - 1;
      if (sections[index]) {
        navigateToSection(sections[index]);
      }
    }
    
    // Escape key to close modals
    if (e.key === 'Escape') {
      const modal = document.querySelector('[style*="position: fixed"]');
      const overlay = document.getElementById('overlay');
      if (modal) modal.remove();
      if (overlay) overlay.remove();
    }
    
    // Enter key on "Learn More" button
    if (e.key === 'Enter' && document.activeElement.classList.contains('btn-secondary')) {
      showInfo();
    }
  });
}

// ── Event Listeners ─────────────────────────────────────────────────────────
function setupEventListeners() {
  // Reset timer on user interaction
  document.addEventListener('click', resetRedirectTimer);
  document.addEventListener('keypress', resetRedirectTimer);
  
  // Prevent timer reset when clicking on modal close
  document.addEventListener('click', (e) => {
    if (e.target.closest('[onclick*="remove"]')) {
      // Don't reset timer when closing modal
      return;
    }
  });
}

// ── Initialize ─────────────────────────────────────────────────────────────
function initializeIndexPage() {
  startRedirectTimer();
  setupKeyboardNavigation();
  setupEventListeners();
  
  // Add loading animation
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '1';
  }, 100);
}

// ── Start the application when DOM is ready ─────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeIndexPage);
} else {
  initializeIndexPage();
}
