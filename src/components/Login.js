import React, { useState, useCallback, useEffect } from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  Container,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { useLogger } from "@bradbunce/launchdarkly-react-logger";

/**
 * Login component
 * Handles user authentication and password reset functionality
 */

export const Login = () => {
  // Hooks
  const navigate = useNavigate();
  const { login, resetPassword } = useAuth();
  const logger = useLogger();

  // State management
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Handle login form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    logger.debug('Attempting login', { username: credentials.username });

    try {
      setError("");
      setLoading(true);
      
      // Attempt login
      await login(credentials);
      
      logger.info('Login successful', { username: credentials.username });
      
      // Navigate to dashboard after successful login
      navigate("/dashboard", { replace: true });  // Using replace to avoid back-button issues
      
    } catch (err) {
      logger.error('Login failed', { 
        error: err.message,
        username: credentials.username
      });
      // Show a user-friendly error message for authentication failures
      setError("Invalid username or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [credentials, login, navigate, logger]);

  // Handle form input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    logger.debug('Updating credentials', { field: name });
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, [logger]);

  // Handle password reset request
  const handlePasswordResetSubmit = useCallback(async (e) => {
    e.preventDefault();
    logger.debug('Attempting password reset', { email: resetEmail });

    try {
      setResetError("");
      setResetSuccess("");
      await resetPassword(resetEmail);
      
      logger.info('Password reset email sent', { email: resetEmail });
      setResetSuccess("Password reset link sent to your email");
      setResetEmail("");
      
      // Close modal and navigate to home page after a short delay
      setTimeout(() => {
        setShowResetModal(false);
        setResetError("");
        setResetSuccess("");
        setResetEmail("");
        navigate("/", { replace: true });
      }, 3000);
    } catch (err) {
      logger.error('Password reset failed', { 
        error: err.message,
        email: resetEmail 
      });
      setResetError(err.response?.data?.error || err.message || "Failed to send reset link");
    }
  }, [resetEmail, resetPassword, logger, navigate, setShowResetModal, setResetError, setResetSuccess, setResetEmail]);

  // Handle modal close
  const handleCloseResetModal = useCallback(() => {
    logger.debug('Closing password reset modal');
    setShowResetModal(false);
    setResetError("");
    setResetSuccess("");
    setResetEmail("");
  }, [logger]);

  // Handle reset email input changes
  const handleResetEmailChange = useCallback((e) => {
    logger.debug('Updating reset email');
    setResetEmail(e.target.value);
  }, [logger]);

  // Log component state changes
  useEffect(() => {
    logger.debug('Login component state', { 
      loading,
      hasError: !!error,
      hasResetError: !!resetError,
      hasResetSuccess: !!resetSuccess,
      showingResetModal: showResetModal
    });
  }, [loading, error, resetError, resetSuccess, showResetModal, logger]);

  // Show loading spinner while processing
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center login-container" style={{ minHeight: "50vh" }}>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container className="login-container">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Login</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={credentials.username}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                <Button 
                  className="w-100 mb-3" 
                  type="submit" 
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <div className="text-center">
                  <Button 
                    variant="link" 
                    onClick={() => setShowResetModal(true)}
                  >
                    Forgot Password?
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Password reset modal */}
      <Modal show={showResetModal} onHide={handleCloseResetModal}>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetSuccess && (
            <Alert variant="success">{resetSuccess}</Alert>
          )}
          {resetError && (
            <Alert variant="danger">{resetError}</Alert>
          )}
          <Form onSubmit={handlePasswordResetSubmit}>
            <Form.Group className="mb-3" controlId="resetEmail">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={resetEmail}
                onChange={handleResetEmailChange}
                placeholder="Enter your email"
                required
              />
            </Form.Group>
            <Button 
              type="submit" 
              className="w-100"
              disabled={loading}
            >
              Send Reset Link
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};
