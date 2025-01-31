/**
 * LaunchDarkly Configuration
 * Defines context kinds and their properties for feature flag evaluation
 */

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
 * Creates a context object for LaunchDarkly evaluation
 * Returns a user context for initialization
 *
 * @param {Object} userData - User data for user context
 * @returns {Object} Context object for LaunchDarkly
 */
export const createLDContexts = (userData) => {
  // Return just the user context for initialization
  return ContextKinds.USER.createContext(userData);
};

/**
 * Evaluates application-specific flags using only the application context
 */
export const evaluateApplicationFlag = (ldClient, flagKey) => {
  const applicationContext = ContextKinds.APPLICATION.createContext();
  return ldClient.variation(flagKey, applicationContext, false);
};

// Feature flags are defined via environment variables
// Example: REACT_APP_LD_CONSOLE_LOG_FLAG_KEY for console logging
