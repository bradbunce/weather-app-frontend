// Core React and Routing
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// UI Components and Styling
import { Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

// Application Components
import NavigationBar from "./components/NavigationBar";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

// Context Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LDProvider } from "./contexts/LaunchDarklyContext";

/**
 * PrivateRoute Component
 * Higher-order component that protects routes requiring authentication.
 * Redirects to login if user is not authenticated.
 *
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Child components to render when authenticated
 * @returns {React.ReactNode} Protected route content or redirect to login
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * App Component
 * Root component of the application that sets up:
 * - Authentication context
 * - LaunchDarkly feature flags
 * - Routing configuration
 * - Basic layout structure
 *
 * The component hierarchy is:
 * 1. AuthProvider - Manages authentication state
 * 2. LDProvider - Manages feature flags
 * 3. Router - Handles application routing
 * 4. Layout components (NavigationBar, Container)
 *
 * @returns {React.ReactNode} The complete application structure
 */
function App() {
  return (
    <LDProvider>
      <AuthProvider>
        <Router>
          <div className="d-flex flex-column min-vh-100">
            <NavigationBar />
            <Container className="py-4 flex-grow-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </Container>
          </div>
        </Router>
      </AuthProvider>
    </LDProvider>
  );
}

export default App;
