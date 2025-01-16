import React from "react";
import { useFlags } from "launchdarkly-react-client-sdk";
import { useLogger } from "../utils/logger";

const LDProviderComponent = ({ children }) => {
  const ldClient = window.launchDarkly?.client;
  const logger = useLogger();

  React.useEffect(() => {
    if (ldClient) {
      logger.debug('LaunchDarkly client available in context');
    }
  }, [ldClient, logger]);

  if (!ldClient) {
    logger.debug('Awaiting LaunchDarkly client initialization');
    return <div>Loading feature flags...</div>;
  }

  return <>{children}</>;
};

/**
 * Hook to access all feature flags
 * @returns {Object} Object containing all feature flag values
 */
export const useFeatureFlags = () => {
  return useFlags();
};

/**
 * Hook to access a specific feature flag
 * @param {string} flagKey - Key of the feature flag to access
 * @returns {any} Value of the specified feature flag
 */
export const useFeatureFlag = (flagKey) => {
  const flags = useFlags();
  return flags[flagKey];
};

// Export feature flag hooks for easy access
export { useFlags };
export { LDProviderComponent as LDProvider };