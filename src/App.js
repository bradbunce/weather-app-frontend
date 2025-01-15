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
import { useAuth } from "./contexts/AuthContext";
import RootProvider from './contexts/RootContext';

/**
 * PrivateRoute Component
 * Higher-order component that protects routes requiring authentication.
 * Redirects to login if user is not authenticated.
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * App Component
 * Root component of the application that sets up routing and context providers
 */
function App() {
  return (
    <RootProvider>
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
    </RootProvider>
  );
}

export default App;