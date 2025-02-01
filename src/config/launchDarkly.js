/**
 * LaunchDarkly Configuration
 * Defines context kinds and their properties for feature flag evaluation
 */

// Valid SDK log levels
export const SDK_LOG_LEVELS = ['error', 'warn', 'info', 'debug'];

// Local storage key for SDK log level
export const SDK_LOG_LEVEL_STORAGE_KEY = 'ld_sdk_log_level';

/**
 * Gets the stored SDK log level from localStorage
 * @returns {string} The stored log level or 'info' as default
 */
export const getStoredLogLevel = () => {
  const storedLevel = localStorage.getItem(SDK_LOG_LEVEL_STORAGE_KEY);
  return (storedLevel && SDK_LOG_LEVELS.includes(storedLevel))
    ? storedLevel
    : 'info';
};

/**
 * Stores the SDK log level in localStorage
 * @param {string} level - The log level to store
 * @returns {boolean} True if level was valid and stored, false otherwise
 */
export const storeLogLevel = (level) => {
  if (SDK_LOG_LEVELS.includes(level)) {
    localStorage.setItem(SDK_LOG_LEVEL_STORAGE_KEY, level);
    return true;
  }
  return false;
};

export const ContextKinds = {
  // User-specific context for features that vary by user
  USER: {
    kind: "user",
    // Function to create user context from user data
    createContext: (userData) => ({
      kind: "user",
      key: userData?.username || "anonymous",
      name: userData?.name,
      email: userData?.email,
      anonymous: !userData?.username,
    }),
  },

  // Application-wide context for global features
  APPLICATION: {
    kind: "application",
    // Function to create application context
    createContext: () => ({
      kind: "application",
      key: process.env.REACT_APP_NAME || "weather-app",
      environment: process.env.REACT_APP_ENVIRONMENT || "development",
    }),
  },
};

/**
 * Creates a multi-context object for LaunchDarkly evaluation
 * Combines user and application contexts
 *
 * @param {Object} userData - User data for user context
 * @returns {Object} Multi-context object for LaunchDarkly
 */
export const createLDContexts = (userData) => {
  return {
    kind: "multi",
    user: ContextKinds.USER.createContext(userData),
    application: ContextKinds.APPLICATION.createContext()
  };
};

/**
 * Evaluates application-specific flags using only the application context
 */
export const evaluateApplicationFlag = (ldClient, flagKey) => {
  const applicationContext = ContextKinds.APPLICATION.createContext();
  return ldClient.variation(flagKey, applicationContext, false);
};

/**
 * Evaluates the SDK log level flag
 * @param {Object} ldClient - LaunchDarkly client instance
 * @param {Object} context - LaunchDarkly evaluation context
 * @returns {Object} Object containing the evaluated value and whether it's valid
 */
export const evaluateSDKLogLevel = (ldClient, context) => {
  const flagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
  if (!flagKey) {
    console.warn("SDK log level flag key not configured");
    return { value: null, isValid: false };
  }

  const value = ldClient.variation(flagKey, context, getStoredLogLevel());
  const isValid = SDK_LOG_LEVELS.includes(value);
  
  if (isValid) {
    storeLogLevel(value);
  }

  return { value, isValid };
};

// Feature flags are defined via environment variables
// Example: REACT_APP_LD_CONSOLE_LOG_FLAG_KEY for console logging
