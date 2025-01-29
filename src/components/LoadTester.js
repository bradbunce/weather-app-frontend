import React from 'react';
import { Container } from 'react-bootstrap';
import { LocationsLoadTester } from './LocationsLoadTester';
import { useTheme } from '../contexts/ThemeContext';

export const LoadTester = () => {
  const { theme } = useTheme();

  return (
    <Container className={`theme-${theme}`}>
      <h2 className="mb-4 text-title">Load Testing Tools</h2>
      <LocationsLoadTester />
    </Container>
  );
};
