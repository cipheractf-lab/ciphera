// Real-time frontend logging utility
class Logger {
  static log(level, action, details = {}) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] FRONTEND-${level}: ${action}`;
    
    switch(level) {
      case 'INFO':
        console.log(logMessage, details);
        break;
      case 'WARN':
        console.warn(logMessage, details);
        break;
      case 'ERROR':
        console.error(logMessage, details);
        break;
      default:
        console.log(logMessage, details);
    }
  }

  static info(action, details) {
    this.log('INFO', action, details);
  }

  static warn(action, details) {
    this.log('WARN', action, details);
  }

  static error(action, details) {
    this.log('ERROR', action, details);
  }
}

export default Logger;