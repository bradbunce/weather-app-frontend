import React, { useState, useEffect } from "react";
import { asyncWithLDProvider, useFlags } from "launchdarkly-react-client-sdk";
import { useAuth } from "./AuthContext";
import { useLogger } from "../utils/logger";
import { createLDContexts, FeatureFlags } from "../config/launchDarkly";

/**
 * LaunchDarkly Provider Component
 * Manages feature flag evaluation contexts and provides LaunchDarkly client access.
 * 
 * Key features:
 * 1. Initializes LaunchDarkly client with proper configuration
 * 2. Updates contexts based on authentication state
 * 3. Provides access to feature flags and client
 * 4. Handles loading and error states
 */
export const LDProvider = ({ children }) => {
  const logger = useLogger();
  const { user } = useAuth();
  const [error, setError] = useState(null);
  const [LDProviderComponent, setLDProviderComponent] = useState(null);

  // Initialize LaunchDarkly client
  useEffect(() => {
    const initializeLDClient = async () => {
      logger.info("Initializing LaunchDarkly client");
      try {
        const Provider = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: createLDContexts(null) // Initial context with no user
        });
        
        logger.debug("LaunchDarkly client initialized successfully");
        setLDProviderComponent(() => Provider);
        setError(null);
      } catch (error) {
        const errorMessage = "Error initializing LaunchDarkly client";
        logger.error(errorMessage, {
          error: error.message,
          stack: error.stack
        });
        setError(errorMessage);
      }
    };

    initializeLDClient();
  }, [logger]);

  // Update contexts when user state changes
  useEffect(() => {
    const updateContexts = async () => {
      if (!window.launchDarkly?.client) {
        logger.warn("LaunchDarkly client not found in window object");
        return;
      }

      logger.debug("Updating LaunchDarkly contexts", {
        hasUser: !!user,
        username: user?.username
      });

      try {
        await window.launchDarkly.client.identify(createLDContexts(user));
        logger.debug("LaunchDarkly contexts updated successfully");
      } catch (error) {
        logger.error("Error updating LaunchDarkly contexts", {
          error: error.message,
          stack: error.stack
        });
      }
    };

    updateContexts();
  }, [user, logger]);

  if (error) {
    logger.trace("Rendering error state", { error });
    return <div>Error initializing feature flags: {error}</div>;
  }

  if (!LDProviderComponent) {
    logger.trace("Rendering loading state");
    return <div>Loading feature flags...</div>;
  }

  return <LDProviderComponent>{children}</LDProviderComponent>;
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

// Export feature flag keys and hooks for easy access
export { FeatureFlags };
export { useFlags };
