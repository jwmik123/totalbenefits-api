const fs = require('fs');
const path = require('path');

const logError = (error, context = {}) => {
    const logDir = path.join(process.cwd(), 'logs');

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'error.log');

    const logEntry = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        context
    };

    fs.appendFileSync(
        logFile,
        JSON.stringify(logEntry, null, 2) + ',\n',
        'utf8'
    );
};

module.exports = { logError };
