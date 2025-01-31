import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useLogger, LogLevel } from "@bradbunce/launchdarkly-react-logger";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { createLDContexts } from "../config/launchDarkly";

const LDContext = createContext();

export const LDProvider = ({ children, onReady }) => {
  const [LDClient, setLDClient] = useState(null);
  const initializationRef = useRef(false);
  const contextRef = useRef(null);
  const logger = useLogger({
    minimumLevel: LogLevel.Debug,
    name: 'LaunchDarklyContext'
  });

  // Initialize LaunchDarkly client
  useEffect(() => {
    const initializeLDClient = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;

      try {
        // Create multi-context for both user and application
        contextRef.current = createLDContexts(null);
        
        const LDProviderComponent = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: contextRef.current,
          options: {
            sendEvents: true,
            streaming: true
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

          logger.info('LaunchDarkly client ready and stream connection established');
        }

        setLDClient(() => LDProviderComponent);
        onReady?.();
      } catch (error) {
        console.error("Error initializing LaunchDarkly", { error: error.message });
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