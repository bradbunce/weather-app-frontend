import { useLDClient } from "launchdarkly-react-client-sdk";
import { FeatureFlags, createApplicationContext } from "../config/launchDarkly";

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

class Logger {
  constructor() {
    this.ldClient = null;
    this.FLAG_KEY = FeatureFlags.FRONTEND_CONSOLE_LOGGING;
  }

  setLDClient(client) {
    this.ldClient = client;
  }

  getCurrentLogLevel() {
    if (!this.ldClient) {
      console.warn('🟡 Logger: LaunchDarkly client not available');
      return LogLevel.ERROR;
    }

    try {
      // Use application context for logging level evaluation
      const context = createApplicationContext();
      return this.ldClient.variation(this.FLAG_KEY, context, LogLevel.ERROR);
    } catch (error) {
      console.error('🔴 Logger: Error evaluating log level flag', error);
      return LogLevel.ERROR;
    }
  }

  shouldLog(level) {
    return level <= this.getCurrentLogLevel();
  }

  error(...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('🔴', ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('🟡', ...args);
    }
  }

  info(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info('🔵', ...args);
    }
  }

  log(...args) {
    // Alias for info
    this.info(...args);
  }

  debug(...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug('⚪', ...args);
    }
  }

  trace(...args) {
    if (this.shouldLog(LogLevel.TRACE)) {
      console.trace('🟣', ...args);
    }
  }

  // Group related logs
  group(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  // For performance measurements
  time(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label);
    }
  }
}

export const logger = new Logger();

// React hook to use the logger
export const useLogger = () => {
  const ldClient = useLDClient();
  
  // Set the LD client whenever it changes
  if (ldClient) {
    logger.setLDClient(ldClient);
  }
  
  return logger;
};
