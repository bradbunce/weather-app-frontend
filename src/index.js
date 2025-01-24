// Import required dependencies
// React core library for creating React components
import React from "react";
// createRoot API from React 18 for concurrent rendering features
import { createRoot } from "react-dom/client";
// Main App component that serves as the root of our component tree
import { App } from "./App";

// Get the root DOM element where our React app will be mounted
// This element is defined in public/index.html
const container = document.getElementById("root");
// Ensure the root element exists to prevent runtime errors
if (!container) {
  throw new Error("Failed to find the root element");
}

// Create a root using React 18's createRoot API
// This enables concurrent rendering features and replaces the legacy ReactDOM.render
const root = createRoot(container);

// Determine if we're running in development mode
// This affects whether StrictMode is enabled
const isDevelopment = process.env.REACT_APP_ENVIRONMENT === "development";

// Render the app
root.render(
  isDevelopment ? (
    // In development, wrap the app in StrictMode
    // StrictMode helps identify potential problems by:
    // - Detecting unsafe lifecycles
    // - Warning about legacy API usage
    // - Detecting unexpected side effects
    // - Ensuring reusable state
    <React.StrictMode>
      <App />
    </React.StrictMode>
  ) : (
    // In production, render without StrictMode to avoid the extra checks
    // and double-rendering behavior that StrictMode introduces
    <App />
  )
);
