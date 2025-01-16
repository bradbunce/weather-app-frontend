import React, { useState, useEffect } from 'react';
import { asyncWithLDProvider, useFlags } from "launchdarkly-react-client-sdk";
import { AuthProvider } from './AuthContext';
import { createApplicationContext } from '../config/launchDarkly';
import { useLogger } from '../utils/logger';

// Debugging component to verify LaunchDarkly is working
const LDDebugger = () => {
  const flags = useFlags();
  const logger = useLogger();

  useEffect(() => {
    console.log('🔍 LaunchDarkly Debug Info:', {
      flags,
      loggerLevel: logger.getCurrentLogLevel(),
      hasLDClient: Boolean(window.launchDarkly?.client)
    });

    // Test all log levels
    logger.fatal('Test FATAL log');
    logger.error('Test ERROR log');
    logger.warn('Test WARN log');
    logger.info('Test INFO log');
    logger.debug('Test DEBUG log');
    logger.trace('Test TRACE log');
  }, [flags, logger]);

  return null;
};

const RootProvider = ({ children }) => {
  const [LDProvider, setLDProvider] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initLD = async () => {
      try {
        console.log('🔄 Initializing LaunchDarkly...');
        const Provider = await asyncWithLDProvider({
          clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
          context: createApplicationContext(),
          options: {
            bootstrap: 'localStorage',
            streamUrl: window.location.protocol + '//clientstream.launchdarkly.com'
          }
        });
        console.log('✅ LaunchDarkly initialized successfully');
        setLDProvider(() => Provider);
      } catch (error) {
        console.error('❌ LaunchDarkly initialization error:', error);
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
      <LDDebugger />
      <AuthProvider>
        {children}
      </AuthProvider>
    </LDProvider>
  );
};

export default RootProvider;