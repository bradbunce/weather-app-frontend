import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Container } from "react-bootstrap";

// Import custom context providers
import { useAuth } from "./contexts/AuthContext";
import { LDProvider } from "./contexts/LaunchDarklyContext"; // Feature flag management

import NavigationBar from "./components/NavigationBar";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import { AuthProvider } from "./contexts/AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  return (
    <AuthProvider>
      <LDProvider>
        <Router>
          <div className="d-flex flex-column min-vh-100">
            <NavigationBar />
            <Container className="py-4 flex-grow-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
      </LDProvider>
    </AuthProvider>
  );
}

// PrivateRoute component to protect authenticated routes
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default App;
