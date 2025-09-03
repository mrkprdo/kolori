type LogLevel = "log" | "warn" | "error" | "info";

class Logger {
  private readonly isDevelopment: boolean;
  private readonly noop = () => {};

  constructor() {
    this.isDevelopment = __DEV__;
  }

  private executeLog(level: LogLevel, ...args: any[]): void {
    if (this.isDevelopment && console[level]) {
      console[level](...args);
    }
  }

  readonly log = (...args: any[]): void => {
    this.executeLog("log", ...args);
  };

  readonly warn = (...args: any[]): void => {
    this.executeLog("warn", ...args);
  };

  readonly error = (...args: any[]): void => {
    this.executeLog("error", ...args);
  };

  readonly info = (...args: any[]): void => {
    this.executeLog("info", ...args);
  };
}

export const logger = new Logger();
export default logger;
