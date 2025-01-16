import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Import providers
import { AuthProvider } from "./contexts/AuthContext";
import { LDProvider } from "./contexts/LaunchDarklyContext";

// Import main App component
import { App } from "./App";

const container = document.getElementById("root");
const root = createRoot(container);
const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

const AppContent = (
  <BrowserRouter>
    <LDProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LDProvider>
  </BrowserRouter>
);

root.render(
  isProduction ? AppContent : <React.StrictMode>{AppContent}</React.StrictMode>
);