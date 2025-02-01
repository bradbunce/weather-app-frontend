import React, { useState, useEffect } from 'react';
import { useLDClient } from 'launchdarkly-react-client-sdk';
import { evaluateSDKLogLevel, createLDContexts, storeLogLevel } from '../config/launchDarkly';

function LogLevelTester() {
  const [currentLevel, setCurrentLevel] = useState('info');
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const client = useLDClient();

  useEffect(() => {
    if (client) {
      // Initial evaluation
      const result = evaluateSDKLogLevel(client, createLDContexts({}));
      console.log('Initial SDK log level evaluation:', result);
      setLastEvaluation(result);
      if (result.isValid) {
        setCurrentLevel(result.value);
        // Store the new level
        storeLogLevel(result.value);
      }

      // Subscribe to flag changes
      const flagKey = process.env.REACT_APP_LD_SDK_LOG_FLAG_KEY;
      if (flagKey) {
        client.on(`change:${flagKey}`, async () => {
          const result = evaluateSDKLogLevel(client, createLDContexts({}));
          console.log('SDK log level flag changed:', result);
          setLastEvaluation(result);
          if (result.isValid) {
            setCurrentLevel(result.value);
            // Store the new level and trigger reload
            storeLogLevel(result.value);
            
            // Log the change and reload immediately to reinitialize with new level
            console.log('=== Log Level Changed ===');
            console.log(`New log level will be: ${result.value}`);
            console.log('Reloading to reinitialize client...');
            window.location.reload();
          }
        });
      }
    }
  }, [client]);

  return (
    <div className="p-4">
      <h2>SDK Log Level Tester</h2>
      <div className="mt-4">
        <h4>Current State:</h4>
        <p>SDK Log Level: {currentLevel}</p>
        {lastEvaluation && (
          <div>
            <h4>Last Flag Evaluation:</h4>
            <pre>
              {JSON.stringify(lastEvaluation, null, 2)}
            </pre>
          </div>
        )}
      </div>
      <div className="mt-4">
        <h4>Instructions:</h4>
        <ol>
          <li>Open your browser's console to see evaluation logs</li>
          <li>Change the SDK log level flag in LaunchDarkly</li>
          <li>Valid levels: error, warn, info, debug</li>
          <li>Invalid values will be logged but not applied</li>
        </ol>
      </div>
    </div>
  );
}

export default LogLevelTester;
