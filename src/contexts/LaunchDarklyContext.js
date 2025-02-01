import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { asyncWithLDProvider, basicLogger } from "launchdarkly-react-client-sdk";
import { createLDContexts, getStoredLogLevel } from "../config/launchDarkly";

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
      
      const currentLogLevel = getStoredLogLevel();
      console.log('=== Initializing LaunchDarkly Client ===');
      console.log(`Setting SDK log level to: ${currentLogLevel}`);
      
      const LDProviderComponent = await asyncWithLDProvider({
        clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
        context: contextRef.current,
        options: {
          sendEvents: true,
          streaming: true,
          evaluationReasons: true,
          logger: basicLogger({
            level: currentLogLevel,
            destination: console.debug.bind(console),
            debug: console.debug.bind(console),
            info: console.info.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console)
          })
        }
      });
      
      console.log('=== LaunchDarkly Client Initialized ===');

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
