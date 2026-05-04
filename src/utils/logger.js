const config = require('../config/environment');
const fs = require('fs');
const path = require('path');

const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        this.level = logLevels[config.LOG_LEVEL] || logLevels.info;
        this.logFile = config.LOG_FILE;
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        const dir = path.dirname(this.logFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...meta
        };
    }

    writeLog(logEntry) {
        const logString = JSON.stringify(logEntry) + '\n';

        try {
            fs.appendFileSync(this.logFile, logString);
        } catch (error) {
            console.error(`Logger failed to write to ${this.logFile}:`, error.message || error);
        }

        const color = {
            error: '\x1b[31m',
            warn: '\x1b[33m',
            info: '\x1b[36m',
            debug: '\x1b[35m',
            reset: '\x1b[0m'
        };

        console.log(
            `${color[logEntry.level]}[${logEntry.level.toUpperCase()}]${color.reset} ${logEntry.timestamp} - ${logEntry.message}`
        );
    }

    log(level, message, meta = {}) {
        if (logLevels[level] <= this.level) {
            const logEntry = this.formatMessage(level, message, meta);
            this.writeLog(logEntry);
        }
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
}

module.exports = new Logger();