import React from 'react';
import { Spinner } from 'react-bootstrap';

export const LoadingSpinner = () => (
  <div className="text-center my-4">
    <Spinner animation="border" role="status" className="mb-2" />
  </div>
);