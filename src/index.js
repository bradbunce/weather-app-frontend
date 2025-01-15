// Core React and ReactDOM imports
import React from 'react';
import { createRoot } from 'react-dom/client';

// Global Styles
import './index.css';

// Application Root Component
import App from './App';

/**
 * Application Bootstrap Configuration
 * Sets up the React 18+ concurrent rendering environment and initializes the application
 * with appropriate development/production settings.
 * 
 * Key aspects:
 * 1. Uses React 18's createRoot for concurrent rendering capabilities
 * 2. Configures StrictMode based on environment
 * 3. Handles production vs development rendering differences
 */

/**
 * Root DOM Element
 * The main container where React will mount the application
 * @type {HTMLElement}
 */
const container = document.getElementById("root");

/**
 * React Root Instance
 * Creates a concurrent rendering root using React 18's createRoot API
 * @type {Root}
 */
const root = createRoot(container);

/**
 * Environment Configuration
 * Determines if the application is running in production mode
 * Used to conditionally apply StrictMode in development
 * @type {boolean}
 */
const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

/**
 * Application Content
 * The root App component that serves as the entry point for the React component tree
 * @type {JSX.Element}
 */
const AppContent = <App />;

/**
 * Application Rendering
 * Renders the application with environment-specific configurations:
 * - Development: Includes StrictMode for additional runtime checks and warnings
 * - Production: Renders without StrictMode for optimal performance
 * 
 * StrictMode Benefits in Development:
 * 1. Identifies potential problems in the application
 * 2. Warns about deprecated lifecycle methods
 * 3. Detects unexpected side effects
 * 4. Ensures better compatibility with concurrent rendering
 */
root.render(
  isProduction ? AppContent : <React.StrictMode>{AppContent}</React.StrictMode>
);
