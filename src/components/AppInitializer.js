import React from 'react';
import { Spinner } from 'react-bootstrap';

export const AppInitializer = ({ ldReady, authReady, children }) => {
  const isLoading = !ldReady || !authReady;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status" className="mb-2" />
      </div>
    );
  }

  return children;
};