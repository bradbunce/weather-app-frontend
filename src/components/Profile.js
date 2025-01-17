import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, Form, Button, Alert, Container } from "react-bootstrap";

export default function Profile() {
  const { user, updatePassword } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const currentPasswordRef = useRef();
  const newPasswordRef = useRef();
  const passwordConfirmRef = useRef();

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (newPasswordRef.current.value !== passwordConfirmRef.current.value) {
      return setError("New passwords do not match");
    }
    
    if (newPasswordRef.current.value.length < 6) {
      return setError("New password must be at least 6 characters");
    }

    try {
      setMessage("");
      setError("");
      setLoading(true);

      await updatePassword(newPasswordRef.current.value);
      
      setMessage("Password updated successfully");
      currentPasswordRef.current.value = "";
      newPasswordRef.current.value = "";
      passwordConfirmRef.current.value = "";
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <Card>
          <Card.Body>
            <h2 className="text-center mb-4">Update Password</h2>
            {user && (
              <p className="text-center text-muted mb-4">
                Logged in as: {user.username}
              </p>
            )}
            
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group id="current-password" className="mb-3">
                <Form.Label>Current Password</Form.Label>
                <Form.Control
                  type="password"
                  ref={currentPasswordRef}
                  required
                  placeholder="Enter current password"
                />
              </Form.Group>

              <Form.Group id="new-password" className="mb-3">
                <Form.Label>New Password</Form.Label>
                <Form.Control
                  type="password"
                  ref={newPasswordRef}
                  required
                  placeholder="Enter new password"
                />
              </Form.Group>
              
              <Form.Group id="password-confirm" className="mb-3">
                <Form.Label>Confirm New Password</Form.Label>
                <Form.Control
                  type="password"
                  ref={passwordConfirmRef}
                  required
                  placeholder="Confirm new password"
                />
              </Form.Group>
              
              <Button 
                disabled={loading}
                className="w-100" 
                type="submit"
              >
                Update Password
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}