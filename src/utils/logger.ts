// React Native Logger Utility
// Adapted from kolori_old/src/utils/logger.js

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = __DEV__;
  }

  log(...args: any[]) {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  warn(...args: any[]) {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args: any[]) {
    if (this.isDevelopment) {
      console.error(...args);
    }
  }

  info(...args: any[]) {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }
}

export const logger = new Logger();
export default logger;