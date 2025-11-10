const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const logFile = path.join(logsDir, 'app.log');
const errorLogFile = path.join(logsDir, 'error.log');
const dbLogFile = path.join(logsDir, 'database.log');

// Helper function to format log message
const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const argsStr = args.length > 0 ? ' ' + JSON.stringify(args) : '';
  return `[${timestamp}] [${level}] ${message}${argsStr}\n`;
};

// Helper function to write to file
const writeToFile = (filePath, message) => {
  try {
    fs.appendFileSync(filePath, message, 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
};

const logger = {
  // Info log
  info: (message, ...args) => {
    const logMessage = formatMessage('INFO', message, ...args);
    console.log(`\x1b[36m[INFO]\x1b[0m ${message}`, ...args);
    writeToFile(logFile, logMessage);
  },

  // Error log
  error: (message, ...args) => {
    const logMessage = formatMessage('ERROR', message, ...args);
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
    writeToFile(logFile, logMessage);
    writeToFile(errorLogFile, logMessage);
  },

  // Warning log
  warn: (message, ...args) => {
    const logMessage = formatMessage('WARN', message, ...args);
    console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    writeToFile(logFile, logMessage);
  },

  // Debug log
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      const logMessage = formatMessage('DEBUG', message, ...args);
      console.debug(`\x1b[90m[DEBUG]\x1b[0m ${message}`, ...args);
      writeToFile(logFile, logMessage);
    }
  },

  // Database log
  db: (message, ...args) => {
    const logMessage = formatMessage('DB', message, ...args);
    console.log(`\x1b[35m[DB]\x1b[0m ${message}`, ...args);
    writeToFile(dbLogFile, logMessage);
    writeToFile(logFile, logMessage);
  },

  // HTTP request log
  http: (req, res, responseTime) => {
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${responseTime}ms`;
    const logMessage = formatMessage('HTTP', message);
    console.log(`\x1b[32m[HTTP]\x1b[0m ${message}`);
    writeToFile(logFile, logMessage);
  }
};

module.exports = logger;

