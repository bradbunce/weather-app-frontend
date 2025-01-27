import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios';
import { useLogger } from "@bradbunce/launchdarkly-react-logger";

// Constants
const AUTH_API_URL = process.env.REACT_APP_AUTH_API;

// Utility functions
const validatePassword = (password) => {
  return password.length >= 8;
};

const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

/**
 * PasswordResetConfirm component
 * Handles password reset confirmation with token validation
 */

export const PasswordResetConfirm = () => {
  // Hooks
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();
  const logger = useLogger();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');

  // State management
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true); // Start with loading true
  const [tokenValid, setTokenValid] = useState(false);

  // Validate reset token on component mount
  useEffect(() => {
    const validateToken = async () => {
      logger.debug('Validating password reset token');

      if (!resetToken) {
        logger.warn('No reset token provided');
        setError("The password reset link is invalid. Please request a new password reset link.");
        setLoading(false);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
        return;
      }

      try {
        logger.debug('Sending token validation request');
        await axios.post(`${AUTH_API_URL}/validate-reset-token`, {
          resetToken
        });
        
        logger.info('Reset token validated successfully');
        setTokenValid(true);
        setLoading(false);
      } catch (err) {
        logger.error('Token validation failed', { error: err.message });
        setError(
          err.response?.data?.error === "Invalid or expired reset token"
            ? "This reset link has expired or already been used. Please request a new password reset."
            : "This password reset link is no longer valid. Please request a new one."
        );
        setLoading(false);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    };

    validateToken();
  }, [resetToken, navigate, logger]);

  // Handle password update
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    logger.debug('Password reset form submitted');

    // Validate password match
    if (!validatePasswordMatch(newPassword, confirmPassword)) {
      logger.warn('Password mismatch in reset form');
      setError("The passwords you entered don't match. Please try again.");
      return;
    }

    // Validate password length
    if (!validatePassword(newPassword)) {
      logger.warn('Password too short in reset form');
      setError("Your password must be at least 8 characters long.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      logger.debug('Attempting to reset password');
      await confirmPasswordReset(resetToken, newPassword);
      
      logger.info('Password reset successful');
      setSuccess("Your password has been successfully reset! You'll be redirected to the home page.");
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      logger.error('Password reset failed', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, resetToken, confirmPasswordReset, navigate, logger]);

  // Handle password input changes
  const handlePasswordChange = useCallback((e) => {
    logger.debug('Updating new password field');
    setNewPassword(e.target.value);
  }, [logger]);

  const handleConfirmPasswordChange = useCallback((e) => {
    logger.debug('Updating confirm password field');
    setConfirmPassword(e.target.value);
  }, [logger]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    logger.debug('Dismissing password reset error');
    setError("");
  }, [logger]);

  // Loading state
  if (loading) {
    logger.debug('Showing loading state');
    return (
      <Container>
        <Row className="justify-content-md-center mt-5">
          <Col md={6} className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Validating your reset link...</p>
          </Col>
        </Row>
      </Container>
    );
  }

  // Invalid token state
  if (!tokenValid) {
    logger.debug('Showing invalid token state');
    return (
      <Container>
        <Row className="justify-content-md-center mt-5">
          <Col md={6}>
            <Alert variant="warning">
              {error}
              <div className="mt-2">
                <small>Redirecting you to the login page...</small>
              </div>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  logger.debug('Rendering password reset form');
  
  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Create New Password</h2>
              {error && (
                <Alert variant="danger" dismissible onClose={handleDismissError}>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success">
                  {success}
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    required
                    autoComplete="new-password"
                  />
                  <Form.Text className="text-muted">
                    Password must be at least 8 characters long
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                  />
                </Form.Group>

                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading || success}
                >
                  {loading ? "Setting New Password..." : "Reset Password"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
