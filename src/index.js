import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { asyncWithLDProvider } from "launchdarkly-react-client-sdk";
import { AuthProvider } from "./contexts/AuthContext";
import { App } from "./App";

const initLD = async () => {
  const LDProviderComponent = await asyncWithLDProvider({
    clientSideID: process.env.REACT_APP_LD_CLIENTSIDE_ID,
    options: {
      bootstrap: 'localStorage'
    }
  });

  const container = document.getElementById("root");
  const root = createRoot(container);
  const isProduction = process.env.REACT_APP_ENVIRONMENT === "production";

  const AppContent = (
    <BrowserRouter>
      <LDProviderComponent>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LDProviderComponent>
    </BrowserRouter>
  );

  root.render(
    isProduction ? AppContent : <React.StrictMode>{AppContent}</React.StrictMode>
  );
};

// Initialize the application
initLD().catch(console.error);