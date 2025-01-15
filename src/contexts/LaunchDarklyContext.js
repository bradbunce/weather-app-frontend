import React from "react";
import { useFlags } from "launchdarkly-react-client-sdk";
import { useLogger } from "../utils/logger";
import { FeatureFlags } from "../config/launchDarkly";

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

// Export feature flag keys and hooks for easy access
export { FeatureFlags };
export { useFlags };