import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Only redirect if we're certain about the authentication state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // We only redirect if we're certain the user is not authenticated
  if (isAuthenticated === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // During loading, show nothing to prevent flicker
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect authenticated users away from login/register pages
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || "/dashboard"} replace />;
  }

  return children;
};

const AppContent = ({ ldReady, authReady }) => {
  const { isLoading: authLoading } = useAuth();
  
  // Show loading spinner only during initial load
  if (!ldReady || !authReady || authLoading) {
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