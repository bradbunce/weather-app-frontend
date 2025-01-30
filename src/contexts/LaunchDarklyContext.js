import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLogger } from "@bradbunce/launchdarkly-react-logger";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { createLDContexts } from "../config/launchDarkly";

const LDContext = createContext();

export const LDProvider = ({ children, onReady }) => {
  const [LDClient, setLDClient] = useState(null);
  const initializationRef = useRef(false);
  const logger = useLogger();

  // Update log level when flag changes
  useEffect(() => {
    if (!LDClient) return;

    const logLevelFlagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
    if (!logLevelFlagKey) return;

    // Get the underlying LaunchDarkly client instance
    const ldClient = LDClient.client;
    
    // Listen for flag changes
    const handleFlagChange = (flagKey) => {
      if (flagKey === logLevelFlagKey) {
        const newLogLevel = ldClient.variation(logLevelFlagKey, 'info');
        ldClient.setLogLevel(newLogLevel);
        logger.info(`LaunchDarkly SDK log level updated to: ${newLogLevel}`);
      }
    };

    // Set initial log level
    const initialLogLevel = ldClient.variation(logLevelFlagKey, 'info');
    ldClient.setLogLevel(initialLogLevel);
    logger.info(`LaunchDarkly SDK log level initialized to: ${initialLogLevel}`);

    // Subscribe to flag changes
    ldClient.on('change', handleFlagChange);

    return () => {
      ldClient.off('change', handleFlagChange);
    };
  }, [LDClient, logger]);

  // Initialize LaunchDarkly client
  useEffect(() => {
    const initializeLDClient = async () => {
      if (initializationRef.current) return; // Prevent multiple initializations
      initializationRef.current = true;

      try {
        // Initialize with multi-context right away (null user = anonymous)
        const initialContexts = createLDContexts(null);
        const LDProviderComponent = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: initialContexts, // Set initial context here
          timeout: 2, // Set client init timeout (seconds)
          options: {
            logger: {
              // Default to info level, will be updated by flag evaluation
              level: 'info'
            },
            bootstrap: {
              // Set initial flag values
              [process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY]: 'info'
            }
          }
        });
        setLDClient(() => LDProviderComponent);
        onReady?.(); // Call onReady when LD is initialized
      } catch (error) {
        logger.error("Error initializing LaunchDarkly", { error: error.message });
      }
    };
    initializeLDClient();
  }, [onReady, logger]);

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
