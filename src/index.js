// Import React for JSX support and component creation
import React from 'react';
// Import createRoot for concurrent rendering support in React 18+
import { createRoot } from 'react-dom/client';
// Import global styles
import './index.css';
// Import the root App component
import App from './App';

// Get root DOM element where React will mount the application
const container = document.getElementById("root");
// Create a root for concurrent rendering
const root = createRoot(container);

// Check if app is running in production environment
const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

// Create the app content
const AppContent = <App />;

// Render the application
// In development, wrap with StrictMode for additional checks
// In production, render without StrictMode for better performance
root.render(
  isProduction ? AppContent : <React.StrictMode>{AppContent}</React.StrictMode>
);
