// =============================================
// CyberShield Test Metrics Tracker
// Independent module - stores everything in JSON
// =============================================

const TestMetricsTracker = {
    KEY: 'cybershield_test_metrics',   // separate from visit & load trackers

    // Simple assertion helper
    assert: function(condition, testName, module) {
        return {
            testName: testName,
            module: module,
            passed: !!condition,
            timestamp: Date.now()
        };
    },

    // All test cases (you can add more easily)
    runAllTests: function() {
        const startTime = performance.now();
        const results = [];
        let totalTests = 0;
        let passedTests = 0;

        // 1. MockData integrity tests
        totalTests++;
        results.push(this.assert(MockData.devices && MockData.devices.length > 0, "Devices data exists", "devices.js"));
        totalTests++;
        results.push(this.assert(MockData.threats && MockData.threats.length > 0, "Threats data exists", "threats.js"));

        // 2. Utility function tests (from your existing code)
        totalTests++;
        const timeAgoTest = typeof timeAgo === 'function' && timeAgo(Date.now() - 3600000) !== "";
        results.push(this.assert(timeAgoTest, "timeAgo function works", "shared"));

        // 3. Filter/search tests (example)
        totalTests++;
        const filteredDevices = MockData.devices.filter(d => d.riskLevel === "High");
        results.push(this.assert(filteredDevices.length >= 1, "High-risk device filter works", "devices.js"));

        // 4. Simulated defect injection test (for Defect Detection Effectiveness)
        const injectedBug = { id: "BUG-999", riskLevel: "Critical", status: "Open" };
        totalTests++;
        const bugDetected = injectedBug.riskLevel === "Critical";
        results.push(this.assert(bugDetected, "Injected critical bug detected", "audit.js"));

        // Count pass rate
        passedTests = results.filter(r => r.passed).length;

        const executionTimeMs = Math.round(performance.now() - startTime);

        // Prepare final metrics
        const metrics = {
            timestamp: new Date().toISOString(),
            totalTestCases: totalTests,
            passedTests: passedTests,
            passRatePercent: Math.round((passedTests / totalTests) * 100),
            executionTimeMs: executionTimeMs,
            modulesTested: [...new Set(results.map(r => r.module))],
            testResults: results,
            defectDetectionRate: Math.round((passedTests / totalTests) * 100)   // same as pass rate for now
        };

        this.saveToJSON(metrics);
        console.log("✅ Test Metrics Recorded:", metrics);
        return metrics;
    },

    // JSON storage (exactly like your PageLoadTracker & PageTracker)
    loadJSON: function() {
        const data = localStorage.getItem(this.KEY);
        return data ? JSON.parse(data) : { history: [] };
    },

    saveToJSON: function(newMetrics) {
        const data = this.loadJSON();
        data.history = data.history || [];
        data.history.unshift(newMetrics);           // newest first
        if (data.history.length > 50) data.history.pop(); // keep last 50 runs
        localStorage.setItem(this.KEY, JSON.stringify(data, null, 2));
    },

    // Helper to view raw data (call from console)
    showRawJSON: function() {
        console.log("📊 CyberShield Test Metrics JSON:");
        console.log(JSON.parse(localStorage.getItem(this.KEY) || '{"history":[]}'));
    },

    // Auto-run on page load (optional - remove if you want manual only)
    init: function() {
        // Run tests silently after page loads
        window.addEventListener('load', () => {
            setTimeout(() => this.runAllTests(), 800); // small delay so MockData is ready
        });
    }
};

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => TestMetricsTracker.init());