import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Form, Button, Card, Alert, Container, Row, Col } from "react-bootstrap";

export default function Profile() {
  const { updatePassword } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const passwordRef = useRef();
  const passwordConfirmRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (passwordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("Passwords do not match");
    }
    
    if (passwordRef.current.value.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    try {
      setMessage("");
      setError("");
      setLoading(true);
      await updatePassword(passwordRef.current.value);
      setMessage("Password updated successfully");
      passwordRef.current.value = "";
      passwordConfirmRef.current.value = "";
    } catch (error) {
      setError("Failed to update password: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Update Password</h2>
              {error && <Alert variant="danger">{error}</Alert>}
              {message && <Alert variant="success">{message}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    ref={passwordRef}
                    required
                    placeholder="Enter new password"
                  />
                </Form.Group>
                <Form.Group className="mb-3" controlId="password-confirm">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    ref={passwordConfirmRef}
                    required
                    placeholder="Confirm new password"
                  />
                </Form.Group>
                <Button className="w-100" type="submit" disabled={loading}>
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
