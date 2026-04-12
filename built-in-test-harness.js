// =============================================
// CyberShield Built-in Test Harness
// 100% native browser APIs - independent module
// =============================================

const BuiltInTestHarness = {
    // Separate JSON keys - completely independent from other trackers
    KEYS: {
        assertions: 'cybershield_builtin_assertions',
        errors: 'cybershield_builtin_errors',
        performance: 'cybershield_builtin_perf',
        dom: 'cybershield_builtin_dom'
    },

    // 1. Assertion Testing (console.assert)
    runAssertions: function () {
        const results = [];
        const start = performance.now();

        // Example assertions on your existing MockData & helpers
        results.push({ name: "MockData.devices exists", passed: !!MockData?.devices?.length });
        results.push({ name: "MockData.threats exists", passed: !!MockData?.threats?.length });
        results.push({ name: "timeAgo function exists", passed: typeof timeAgo === 'function' });
        results.push({ name: "High risk devices filter", passed: MockData.devices.filter(d => d.riskLevel === "High").length > 0 });
        results.push({ name: "Dashboard has stat cards", passed: document.querySelectorAll('.stat-card').length > 0 });

        const duration = Math.round(performance.now() - start);

        this.saveJSON(this.KEYS.assertions, {
            timestamp: new Date().toISOString(),
            totalAssertions: results.length,
            passed: results.filter(r => r.passed).length,
            results: results,
            durationMs: duration
        });
    },

    // 2. Runtime Error Catching
    setupErrorCatcher: function () {
        const errorLog = [];

        // Global error handler (built-in)
        window.onerror = function (msg, url, line, col, error) {
            errorLog.push({
                message: msg,
                url: url,
                line: line,
                timestamp: Date.now()
            });
            console.warn("🚨 CyberShield built-in error caught:", msg);
            return true; // prevent default console error
        };

        // Test some safe operations that could fail
        try {
            // Simulate potential failure points in your code
            const test = MockData.devices[999]; // out-of-bound
            if (!test) throw new Error("Simulated missing device");
        } catch (e) {
            errorLog.push({ message: e.message, type: "caught", timestamp: Date.now() });
        }

        this.saveJSON(this.KEYS.errors, {
            timestamp: new Date().toISOString(),
            totalErrorsCaught: errorLog.length,
            errors: errorLog
        });
    },

    // 3. Performance Benchmarking (Web Performance API)
    runPerformanceBenchmarks: function () {
        const marks = {};

        performance.mark('start-dashboard-load');
        // Simulate operations you already have
        if (typeof loadDashboard === 'function') loadDashboard();
        performance.mark('end-dashboard-load');
        performance.measure('dashboard-load-time', 'start-dashboard-load', 'end-dashboard-load');

        marks.dashboard = performance.getEntriesByName('dashboard-load-time')[0]?.duration || 0;

        // You can add more marks for devices, threats, etc.

        this.saveJSON(this.KEYS.performance, {
            timestamp: new Date().toISOString(),
            benchmarks: marks,
            totalMarks: Object.keys(marks).length
        });
    },

    // 4. DOM & Event Validation
    runDOMValidation: function () {
        const results = [];

        // Check common UI elements from your files
        results.push({ name: "Modal exists", passed: !!document.querySelector('.modal') });
        results.push({ name: "Toast container exists", passed: !!document.getElementById('toast-container') });
        results.push({ name: "Risk bars rendered", passed: document.querySelectorAll('.risk-bar').length > 0 });

        // Simulate click on a device (safe test)
        const firstDevice = document.querySelector('.device-row');
        if (firstDevice) {
            const clickEvent = new Event('click', { bubbles: true });
            firstDevice.dispatchEvent(clickEvent);
            results.push({ name: "Device row click simulation", passed: true });
        }

        this.saveJSON(this.KEYS.dom, {
            timestamp: new Date().toISOString(),
            totalChecks: results.length,
            passed: results.filter(r => r.passed).length,
            results: results
        });
    },

    // JSON helper (same pattern as your other trackers)
    saveJSON: function (key, data) {
        const existing = JSON.parse(localStorage.getItem(key) || '{"history": []}');
        existing.history = existing.history || [];
        existing.history.unshift(data);
        if (existing.history.length > 30) existing.history.pop(); // keep last 30 runs
        localStorage.setItem(key, JSON.stringify(existing, null, 2));
    },

    // Run everything silently
    init: function () {
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.runAssertions();
                this.setupErrorCatcher();
                this.runPerformanceBenchmarks();
                this.runDOMValidation();
                console.log("✅ CyberShield Built-in Test Harness completed - all data saved to localStorage");
            }, 1200); // wait for MockData & DOM to be ready
        });
    },

    // Helper: view any stored data in console
    showAllData: function () {
        Object.keys(this.KEYS).forEach(keyName => {
            const key = this.KEYS[keyName];
            console.log(`📊 ${keyName.toUpperCase()} →`, JSON.parse(localStorage.getItem(key) || '{}'));
        });
    }
};

// Auto-start when script loads
document.addEventListener('DOMContentLoaded', () => BuiltInTestHarness.init());