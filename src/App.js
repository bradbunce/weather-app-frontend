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
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) {
    return null;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const AppContent = ({ ldReady, authReady }) => {
  const { isInitialized } = useAuth();

  // Only show spinner during initial app load, not during operations
  const isInitialLoading = !ldReady || !authReady || !isInitialized;

  if (isInitialLoading) {
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