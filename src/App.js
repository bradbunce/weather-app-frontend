import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
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
import { LDProvider } from "./contexts/LaunchDarklyContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();
  
  console.log('PrivateRoute State:', {
    isAuthenticated,
    isInitialized,
    isLoading,
    timestamp: new Date().toISOString(),
    path: window.location.pathname
  });

  // Don't show spinner here, let AppContent handle loading state
  if (!isInitialized || isLoading) {
    return null;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized, isLoading } = useAuth();

  console.log('PublicRoute State:', {
    isAuthenticated,
    isInitialized,
    isLoading,
    timestamp: new Date().toISOString(),
    path: window.location.pathname
  });

  if (!isInitialized || isLoading) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const AppContent = ({ ldReady, authReady }) => {
  const { isLoading, isInitialized } = useAuth();

  console.log('AppContent State:', {
    ldReady,
    authReady,
    isLoading,
    isInitialized,
    timestamp: new Date().toISOString(),
    path: window.location.pathname
  });

  const isAppReady = ldReady && authReady && isInitialized && !isLoading;

  if (!isAppReady) {
    console.log('Showing AppContent spinner because:', {
      ldNotReady: !ldReady,
      authNotReady: !authReady,
      isStillLoading: isLoading,
      notInitialized: !isInitialized,
      timestamp: new Date().toISOString()
    });

    return (
      <div className="d-flex flex-column min-vh-100">
        <NavigationBar />
        <Container className="py-4 flex-grow-1">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <LoadingSpinner />
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <NavigationBar />
      <Container className="py-4 flex-grow-1">
        <Routes>
          {/* Public Routes */}
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
          
          {/* Protected Routes */}
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
      </Container>
    </div>
  );
};

export const App = () => {
  const [ldReady, setLdReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  console.log('App Initialization Status:', { 
    ldReady, 
    authReady,
    timestamp: new Date().toISOString()
  });

  return (
    <LDProvider 
      onReady={() => {
        console.log('LaunchDarkly Ready');
        setLdReady(true);
      }}
    >
      <BrowserRouter>
        <AuthProvider 
          onReady={() => {
            console.log('Auth Provider Ready');
            setAuthReady(true);
          }}
        >
          <AppContent ldReady={ldReady} authReady={authReady} />
        </AuthProvider>
      </BrowserRouter>
    </LDProvider>
  );
};