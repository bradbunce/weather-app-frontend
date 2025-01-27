import React, { useState } from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  Container,
  Row,
  Col,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const PasswordResetRequest = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      await resetPassword(email);
      
      setSuccess("Password reset link has been sent to your email. Please check your inbox. You will be redirected to the login page in 5 seconds.");
      
      // Optional: Redirect after a few seconds or allow manual navigation
      setTimeout(() => {
        navigate("/login");
      }, 5000);
    } catch (err) {
      setError(err.message || "Failed to send password reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Reset Password</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                  <Form.Text className="text-muted">
                    Enter the email associated with your account
                  </Form.Text>
                </Form.Group>
                <Button 
                  type="submit" 
                  className="w-100" 
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <div className="text-center mt-3">
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/login")}
                  >
                    Back to Login
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
