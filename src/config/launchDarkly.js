/**
 * LaunchDarkly Configuration
 * Defines context kinds and their properties for feature flag evaluation
 */

export const ContextKinds = {
  // User-specific context for features that vary by user
  USER: {
    kind: 'user',
    // Function to create user context from user data
    createContext: (userData) => ({
      key: userData?.username || 'anonymous',
      name: userData?.name,
      email: userData?.email,
      anonymous: !userData?.username
    })
  },

  // Application-wide context for global features
  APPLICATION: {
    kind: 'application',
    // Function to create application context
    createContext: () => ({
      key: process.env.REACT_APP_NAME || 'weather-app-frontend',
      environment: process.env.REACT_APP_ENVIRONMENT || 'development'
    })
  }
};

/**
 * Creates a multi-context object for LaunchDarkly evaluation
 * Combines user and application contexts into a single context object
 * 
 * @param {Object} userData - User data for user context
 * @returns {Object} Multi-context object for LaunchDarkly
 */
export const createLDContexts = (userData) => {
  return {
    user: ContextKinds.USER.createContext(userData),
    application: ContextKinds.APPLICATION.createContext()
  };
};

// Feature flag keys
export const FeatureFlags = {
  FRONTEND_CONSOLE_LOGGING: 'frontend-console-logging',
  // Add other feature flag keys here
};
