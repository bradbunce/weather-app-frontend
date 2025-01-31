import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLogger } from "@bradbunce/launchdarkly-react-logger";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { createLDContexts } from "../config/launchDarkly";

const LDContext = createContext();

export const LDProvider = ({ children, onReady }) => {
  const [LDClient, setLDClient] = useState(null);
  const initializationRef = useRef(false);
  const logger = useLogger();

  // Initialize LaunchDarkly client
  useEffect(() => {
    const initializeLDClient = async () => {
      if (initializationRef.current) return; // Prevent multiple initializations
      initializationRef.current = true;

      try {
        // Initialize with user context for anonymous user
        const initialContexts = createLDContexts(null);
        const LDProviderComponent = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: initialContexts
        });

        setLDClient(() => LDProviderComponent);
        onReady?.(); // Call onReady when LD is initialized
      } catch (error) {
        logger.error("Error initializing LaunchDarkly", { error: error.message });
      }
    };
    initializeLDClient();
  }, [onReady, logger]);

  // Update log level when flag changes
  useEffect(() => {
    if (!LDClient?.client) return;

    const logLevelFlagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
    if (!logLevelFlagKey) return;

    try {
      // Set initial log level
      const initialLogLevel = LDClient.client.variation(logLevelFlagKey, 'info');
      logger.info(`LaunchDarkly SDK log level initialized to: ${initialLogLevel}`);

      // Listen for flag changes
      const handleFlagChange = (flagKey) => {
        if (flagKey === logLevelFlagKey) {
          try {
            const newLogLevel = LDClient.client.variation(logLevelFlagKey, 'info');
            logger.info(`LaunchDarkly SDK log level updated to: ${newLogLevel}`);
          } catch (error) {
            logger.error("Error updating log level", { error: error.message });
          }
        }
      };

      LDClient.client.on('change', handleFlagChange);
      return () => {
        LDClient.client.off('change', handleFlagChange);
      };
    } catch (error) {
      logger.error("Error setting up log level monitoring", { error: error.message });
    }
  }, [LDClient, logger]);

  if (!LDClient) {
    return <div />;
  }

  return (
    <LDContext.Provider value={LDClient}>
      <LDClient>{children}</LDClient>
    </LDContext.Provider>
  );
};

export const useLDClient = () => {
  return useContext(LDContext);
};
