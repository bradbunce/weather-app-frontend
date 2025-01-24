import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import "./styles/styles.css";
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";
// Application Components
import { NavigationBar } from "./components/NavigationBar";
import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Dashboard } from "./components/Dashboard";
import Profile from "./components/Profile";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { PasswordResetConfirm } from "./components/PasswordResetConfirm";
// Context Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocationsProvider } from "./contexts/LocationsContext";
import { LDProvider } from "./contexts/LaunchDarklyContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { FontSizeProvider } from "./contexts/FontSizeContext"; // Font size preferences

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  return !isInitialized ? null : isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" replace />
  );
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  return !isInitialized ? null : isAuthenticated ? (
    <Navigate to="/dashboard" replace />
  ) : (
    children
  );
};

const AppContent = ({ ldReady, authReady }) => {
  const { isInitialized } = useAuth();
  const { theme } = useTheme();
  const isInitialLoading = !ldReady || !authReady || !isInitialized;

  const containerClasses = `d-flex flex-column min-vh-100 theme-${theme}`;

  return (
    <div className={containerClasses}>
      <NavigationBar />
      <Container className="py-4 flex-grow-1">
        {isInitialLoading ? (
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "60vh" }}
          >
            <LoadingSpinner />
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/reset-password" element={<PasswordResetConfirm />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
          </Routes>
        )}
      </Container>
    </div>
  );
};

export const App = () => {
  const [ldReady, setLdReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  return (
    <LDProvider onReady={() => setLdReady(true)}>
      <BrowserRouter>
        <ThemeProvider>
          <FontSizeProvider>
            <AuthProvider onReady={() => setAuthReady(true)}>
              <WebSocketProvider>
                <LocationsProvider>
                  <AppContent ldReady={ldReady} authReady={authReady} />
                </LocationsProvider>
              </WebSocketProvider>
            </AuthProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </BrowserRouter>
    </LDProvider>
  );
};
