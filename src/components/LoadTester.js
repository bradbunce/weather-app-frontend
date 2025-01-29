import React from 'react';
import { Container, Alert } from 'react-bootstrap';
import { LocationsLoadTester } from './LocationsLoadTester';
import { useTheme } from '../contexts/ThemeContext';
import { useLDClient } from 'launchdarkly-react-client-sdk';

export const LoadTester = () => {
  const { theme } = useTheme();
  const ldClient = useLDClient();
  const isLoadTestingEnabled = ldClient.variation(process.env.REACT_APP_LD_LOAD_TEST_FLAG_KEY, false);

  if (!isLoadTestingEnabled) {
    return (
      <Container className={`theme-${theme}`}>
        <Alert variant="warning">
          You do not have access to the load testing tools.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className={`theme-${theme}`}>
      <h2 className="mb-4 text-title">Load Testing Tools</h2>
      <LocationsLoadTester />
    </Container>
  );
};
