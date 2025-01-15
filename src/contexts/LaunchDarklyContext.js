import React, { createContext, useContext, useState, useEffect } from "react";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";

const LDContext = createContext();

export const LDProvider = ({ children }) => {
  const [LDClient, setLDClient] = useState(null);

  useEffect(() => {
    const initializeLDClient = async () => {
      try {
        const LDProviderComponent = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
        });
        setLDClient(() => LDProviderComponent);
      } catch (error) {
        console.error("Error initializing LaunchDarkly:", error);
      }
    };

    initializeLDClient();
  }, []);

  if (!LDClient) {
    return <div>Loading...</div>;
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
