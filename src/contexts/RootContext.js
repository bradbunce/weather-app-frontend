import React, { useState } from 'react';
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { AuthProvider } from './AuthContext';
import { createApplicationContext } from '../config/launchDarkly';

const RootProvider = ({ children }) => {
  const [LDProvider, setLDProvider] = useState(null);
  const [error, setError] = useState(null);

  // Initialize LaunchDarkly immediately
  React.useEffect(() => {
    const initLD = async () => {
      try {
        const LDProvider = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: createApplicationContext()
        });
        setLDProvider(() => LDProvider);
      } catch (error) {
        console.error('LaunchDarkly initialization error:', error);
        setError(error.message);
      }
    };
    
    initLD();
  }, []);

  if (error) {
    return <div>Error initializing feature flags: {error}</div>;
  }

  if (!LDProvider) {
    return <div>Loading feature flags...</div>;
  }

  return (
    <LDProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </LDProvider>
  );
};

export default RootProvider;