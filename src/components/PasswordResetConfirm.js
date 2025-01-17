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

export const PasswordResetConfirm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();

  useEffect(() => {
    if (!resetToken) {
      setError("The password reset link is invalid. Please request a new password reset link.");
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    }
  }, [resetToken, navigate]);

  const getErrorMessage = (err) => {
    if (err.response) {
      // Handle specific HTTP status codes
      switch (err.response.status) {
        case 400:
          if (err.response.data?.error?.includes("Invalid or expired")) {
            return "This password reset link has expired or has already been used. Please request a new one.";
          }
          return "There was a problem with your password reset request. Please try again.";
        case 404:
          return "The password reset link is no longer valid. Please request a new one.";
        case 500:
          return "We're experiencing technical difficulties. Please try again later.";
        default:
          return "An error occurred while resetting your password. Please try again.";
      }
    }
    return "Unable to connect to the server. Please check your internet connection.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("The passwords you entered don't match. Please try again.");
      return;
    }

    // Password strength validation
    if (newPassword.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setLoading(true);

      await confirmPasswordReset(resetToken, newPassword);
      
      setSuccess("Your password has been successfully reset! You'll be redirected to the login page in a few seconds.");
      
      // Redirect to login after successful password reset
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <Container>
        <Row className="justify-content-md-center mt-5">
          <Col md={6}>
            <Alert variant="warning">
              Invalid password reset link. Redirecting you to the login page...
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

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