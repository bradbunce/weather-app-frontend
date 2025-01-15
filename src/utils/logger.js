import { useLDClient } from "launchdarkly-react-client-sdk";
import { FeatureFlags, createApplicationContext } from "../config/launchDarkly";

export const LogLevel = {
  FATAL: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5
};

class Logger {
  constructor() {
    this.ldClient = null;
    this.FLAG_KEY = FeatureFlags.FRONTEND_CONSOLE_LOGGING;
    console.log('🔧 Logger initialized with flag key:', this.FLAG_KEY);
  }

  setLDClient(client) {
    this.ldClient = client;
    console.log('🔧 LaunchDarkly client set:', Boolean(this.ldClient));
  }

  getCurrentLogLevel() {
    if (!this.ldClient) {
      console.warn('🟡 Logger: LaunchDarkly client not available');
      return LogLevel.ERROR;
    }

    try {
      const context = createApplicationContext();
      const level = this.ldClient.variation(this.FLAG_KEY, context, LogLevel.ERROR);
      console.log('🔧 Retrieved log level from LaunchDarkly:', level);
      return level;
    } catch (error) {
      console.error('🔴 Logger: Error evaluating log level flag', error);
      return LogLevel.ERROR;
    }
  }

  shouldLog(level) {
    const currentLevel = this.getCurrentLogLevel();
    const shouldLog = level <= currentLevel;
    console.log(`🔍 Checking if should log level ${level} (current: ${currentLevel}): ${shouldLog}`);
    return shouldLog;
  }

  fatal(...args) {
    if (this.shouldLog(LogLevel.FATAL)) {
      console.error('💀', ...args);
    }
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