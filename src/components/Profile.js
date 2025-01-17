import React, { useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, Form, Button, Alert, Container } from "react-bootstrap";

export default function Profile() {
  const { currentUser } = useAuth();
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

      // Get the current user's ID token for authentication
      const idToken = await currentUser.getIdToken();

      const response = await fetch(`${process.env.REACT_APP_AUTH_API}/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          currentPassword: currentPasswordRef.current.value,
          newPassword: newPasswordRef.current.value
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setMessage(data.message || "Password updated successfully");
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
            <p className="text-center text-muted mb-4">
              Logged in as: {currentUser.email}
            </p>
            
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