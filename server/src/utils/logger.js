/**
 * Simple Logger Utility
 */

const levels = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

function log(level, message, data = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  
  if (level === 'error') {
    console.error(logEntry, data);
  } else if (level === 'warn') {
    console.warn(logEntry, data);
  } else if (level === 'debug') {
    if (process.env.DEBUG === 'true') {
      console.debug(logEntry, data);
    }
  } else {
    console.log(logEntry, data);
  }
}

module.exports = {
  error: (msg, data) => log('error', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  info: (msg, data) => log('info', msg, data),
  debug: (msg, data) => log('debug', msg, data),
};
