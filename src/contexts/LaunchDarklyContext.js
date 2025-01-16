import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { createLDContexts } from "../config/launchDarkly";

const LDContext = createContext();

export const LDProvider = ({ children, onReady }) => {
  const [LDClient, setLDClient] = useState(null);
  const initializationRef = useRef(false);

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
        });
        setLDClient(() => LDProviderComponent);
        onReady?.(); // Call onReady when LD is initialized
      } catch (error) {
        console.error("Error initializing LaunchDarkly:", error);
      }
    };
    initializeLDClient();
  }, [onReady]);

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