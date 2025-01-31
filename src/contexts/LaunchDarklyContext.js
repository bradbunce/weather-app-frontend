import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useLogger, LogLevel } from "@bradbunce/launchdarkly-react-logger";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { createLDContexts } from "../config/launchDarkly";

const LDContext = createContext();

export const LDProvider = ({ children, onReady }) => {
  const [LDClient, setLDClient] = useState(null);
  const initializationRef = useRef(false);
  const contextRef = useRef(null);

  // Function to initialize/reinitialize the LaunchDarkly client
  const initializeLDClient = useCallback(async (forceReInit = false) => {
    if (initializationRef.current && !forceReInit) return;
    initializationRef.current = true;

    try {
      // Create multi-context for both user and application
      contextRef.current = createLDContexts(null);
      
      const LDProviderComponent = await asyncWithLDProvider({
        clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
        context: contextRef.current,
        options: {
          sendEvents: true,
          streaming: true,
          evaluationReasons: true
        }
      });

      const client = LDProviderComponent.client;
      if (client) {
        // Wait for client to be ready
        await new Promise((resolve) => {
          const handleReady = () => {
            client.off('ready', handleReady);
            resolve();
          };
          client.on('ready', handleReady);
        });
      }

      setLDClient(() => LDProviderComponent);
      onReady?.();
    } catch (error) {
      console.error("Error initializing LaunchDarkly", { error: error.message });
    }
  }, [onReady]);

  // Initial client initialization
  useEffect(() => {
    initializeLDClient();
  }, [initializeLDClient]);

  // Initialize logger with LaunchDarkly client and context
  useLogger({
    minimumLevel: LogLevel.Debug,
    name: 'LaunchDarklyContext',
    client: LDClient?.client || undefined,
    context: contextRef.current || undefined,
    sdkLogFlagKey: process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY,
    consoleLogFlagKey: process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY,
    defaultSdkLogLevel: 'info',
    defaultConsoleLogLevel: 'info'
  });

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
