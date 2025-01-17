import React, { useState } from "react";
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

export const Login = () => {
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

  const navigate = useNavigate();
  const { login, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setLoading(true);
      await login(credentials);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    try {
      setResetError("");
      setResetSuccess("");
      await resetPassword(resetEmail);
      setResetSuccess("Password reset link sent to your email");
      setResetEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      setResetError(err.response?.data?.error || err.message || "Failed to send reset link");
    }
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetError("");
    setResetSuccess("");
    setResetEmail("");
  };

  return (
    <Container>
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

      {/* Password Reset Modal */}
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
                onChange={(e) => setResetEmail(e.target.value)}
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