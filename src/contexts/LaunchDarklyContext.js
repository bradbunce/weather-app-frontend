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
      // Early environment variable check
      console.log('Environment Variables Check:', {
        clientSideId: process.env.REACT_APP_LD_CLIENTSIDE_ID,
        sdkFlagKey: process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY,
        consoleFlagKey: process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY
      });

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

        // Get and set SDK log level from flag (string value)
        const client = LDProviderComponent.client;
        if (client) {
          // Wait for client to be ready and stream connection established
          await new Promise((resolve) => {
            const handleReady = () => {
              console.log('LaunchDarkly ready event triggered');
              client.off('ready', handleReady);
              resolve();
            };
            console.log('Setting up LaunchDarkly ready handler');
            client.on('ready', handleReady);
          });

          console.log('LaunchDarkly client ready, evaluating flags');
          console.log('All client flags:', client.allFlags());

          // Get SDK log level flag (string type)
          console.log('Starting SDK log level flag evaluation...');
          console.log('Flag key:', process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY);
          console.log('Context:', JSON.stringify(contextRef.current, null, 2));
          
          try {
            console.log('Calling client.variation...');
            const sdkLogLevel = client.variation(process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY, contextRef.current, 'debug');
            console.log('SDK log level flag successfully evaluated to:', sdkLogLevel);
            console.log('Available LogLevels:', Object.keys(LogLevel));
            // Convert string log level to LogLevel enum if needed
            const logLevel = LogLevel[sdkLogLevel.toUpperCase()] || LogLevel.Debug;
            logger.setLevel(logLevel);
            logger.info(`SDK log level initialized to: ${sdkLogLevel}`);
          } catch (error) {
            console.error("Error getting SDK log level flag", { 
              error: error.message,
              flag: process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY
            });
          }

          // Get console log level flag
          try {
            const initialLogLevel = client.variation(process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY, contextRef.current, 'info');
            console.log('Console log level flag evaluated to:', initialLogLevel);
            logger.info(`Console log level initialized to: ${initialLogLevel}`);
          } catch (error) {
            console.error("Error getting console log level flag", { 
              error: error.message,
              flag: process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY
            });
          }
        }

        setLDClient(() => LDProviderComponent);
        onReady?.();
      } catch (error) {
        console.error("Error initializing LaunchDarkly", { error: error.message });
      }
    };
    initializeLDClient();
  }, [onReady, logger]);

  // Update SDK log level when flag changes
  useEffect(() => {
    if (!LDClient?.client) return;

    const handleSdkLogLevelChange = (flagKey) => {
      if (flagKey === process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY) {
        try {
          const newSdkLogLevel = LDClient.client.variation(process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY, contextRef.current, 'debug');
          console.log('SDK log level flag changed to:', newSdkLogLevel);
          const logLevel = LogLevel[newSdkLogLevel.toUpperCase()] || LogLevel.Debug;
          logger.setLevel(logLevel);
          logger.info(`Updated SDK log level to: ${newSdkLogLevel}`);
        } catch (error) {
          console.error("Error handling SDK log level change", { 
            error: error.message,
            flag: process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY
          });
        }
      }
    };

    LDClient.client.on('change', handleSdkLogLevelChange);
    return () => {
      LDClient.client.off('change', handleSdkLogLevelChange);
    };
  }, [LDClient, logger]);

  // Update console log level when flag changes
  useEffect(() => {
    if (!LDClient?.client) return;

    const handleConsoleLogLevelChange = (flagKey) => {
      if (flagKey === process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY) {
        try {
          const newLogLevel = LDClient.client.variation(process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY, contextRef.current, 'info');
          console.log('Console log level flag changed to:', newLogLevel);
          logger.info(`Updated console log level to: ${newLogLevel}`);
        } catch (error) {
          console.error("Error handling console log level change", { 
            error: error.message,
            flag: process.env.REACT_APP_LD_CONSOLE_LOG_FLAG_KEY
          });
        }
      }
    };

    LDClient.client.on('change', handleConsoleLogLevelChange);
    return () => {
      LDClient.client.off('change', handleConsoleLogLevelChange);
    };
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