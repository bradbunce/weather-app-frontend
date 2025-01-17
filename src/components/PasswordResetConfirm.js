import React, { useState, useEffect } from "react";
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

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;

export const PasswordResetConfirm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true); // Start with loading true
  const [tokenValid, setTokenValid] = useState(false);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();

  useEffect(() => {
    const validateToken = async () => {
      if (!resetToken) {
        setError("The password reset link is invalid. Please request a new password reset link.");
        setLoading(false);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
        return;
      }

      try {
        // Call your API to validate the token
        const response = await axios.post(`${AUTH_API_URL}/validate-reset-token`, {
          resetToken
        });
        
        setTokenValid(true);
        setLoading(false);
      } catch (err) {
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
  }, [resetToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setError("The passwords you entered don't match. Please try again.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      await confirmPasswordReset(resetToken, newPassword);
      
      setSuccess("Your password has been successfully reset! You'll be redirected to the login page.");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
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

  // Show error state if token is invalid
  if (!tokenValid) {
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

  // Show password reset form only if token is valid
  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Create New Password</h2>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
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
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    onChange={(e) => setConfirmPassword(e.target.value)}
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