import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// UI Components and Styling
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
import { PasswordResetConfirm } from "./components/PasswordResetConfirm"; // Add this import
// Context Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LDProvider } from "./contexts/LaunchDarklyContext";

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Show loading spinner while checking auth state
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const App = () => {
  const [ldReady, setLdReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const isLoading = !ldReady || !authReady;

  const AppContent = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    return (
      <div className="d-flex flex-column min-vh-100">
        <NavigationBar />
        <Container className="py-4 flex-grow-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/reset-password"
              element={<PasswordResetConfirm />}
            />{" "}
            {/* Add this route */}
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

  return (
    <LDProvider onReady={() => setLdReady(true)}>
      <BrowserRouter>
        <AuthProvider onReady={() => setAuthReady(true)}>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </LDProvider>
  );
};
