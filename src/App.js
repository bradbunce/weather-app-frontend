// Core React and Router imports
import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container } from "react-bootstrap";

// Polyfills for browser compatibility
import "react-app-polyfill/ie11";
import "react-app-polyfill/stable";

// Styles
import "./styles/styles.css";

// Components
import { NavigationBar } from "./components/NavigationBar";
import { Home } from "./components/Home";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Dashboard } from "./components/Dashboard";
import Profile from "./components/Profile";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { PasswordResetConfirm } from "./components/PasswordResetConfirm";

// Context Providers and Hooks
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LocationsProvider } from "./contexts/LocationsContext";
import { LDProvider } from "./contexts/LaunchDarklyContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { FontSizeProvider } from "./contexts/FontSizeContext";

/**
 * Route wrapper for protected routes that require authentication
 * Redirects to login if user is not authenticated
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  
  // Don't render anything until auth is initialized
  if (!isInitialized) return null;
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

/**
 * Route wrapper for public routes that should not be accessible when authenticated
 * Redirects to dashboard if user is already authenticated
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  
  // Don't render anything until auth is initialized
  if (!isInitialized) return null;
  
  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

/**
 * Main application content component
 * Handles routing and layout structure
 */
const AppContent = ({ ldReady, authReady }) => {
  // Hooks for auth state and theme
  const { isInitialized } = useAuth();
  const { theme } = useTheme();
  
  // Show loading state until all required services are ready
  const isInitialLoading = !ldReady || !authReady || !isInitialized;

  // Classes for main container including theme
  const containerClasses = `d-flex flex-column min-vh-100 theme-${theme}`;

  return (
    <div className={containerClasses}>
      {/* Navigation bar - always visible */}
      <NavigationBar />

      {/* Main content container */}
      <Container className="py-4 flex-grow-1">
        {isInitialLoading ? (
          // Loading state while services initialize
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "60vh" }}
          >
            <LoadingSpinner />
          </div>
        ) : (
          // Application routes
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Home />
                </PublicRoute>
              }
            />
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

            {/* Protected routes */}
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

/**
 * Root application component
 * Sets up providers and global state management
 */
export const App = () => {
  // Track initialization state of core services
  const [ldReady, setLdReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  return (
    // Provider hierarchy - ordered by dependency requirements
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
