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
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Profile = () => {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    username: "",
    email: "",
  });
  const { updatePassword, updateProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  // Load current user data
  useEffect(() => {
    if (currentUser) {
      setFormData(prev => ({
        ...prev,
        username: currentUser.username || "",
        email: currentUser.email || "",
      }));
    }
  }, [currentUser]);

  const validateForm = () => {
    // Password validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Username validation
    if (formData.username && (formData.username.length < 3 || formData.username.length > 50)) {
      setError("Username must be between 3 and 50 characters");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);

      // Create an array to store all update promises
      const updatePromises = [];

      // Handle password update
      if (formData.newPassword) {
        updatePromises.push(updatePassword(formData.currentPassword, formData.newPassword));
      }

      // Handle profile updates (username and email)
      if (formData.username !== currentUser.username || formData.email !== currentUser.email) {
        updatePromises.push(
          updateProfile({
            username: formData.username,
            email: formData.email,
            currentPassword: formData.currentPassword // Required for security
          })
        );
      }

      // Execute all updates
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        setMessage("Profile updated successfully!");

        // Clear sensitive form data
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        // Redirect to dashboard after showing success message
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }
    } catch (err) {
      // Handle specific error types
      if (err.code === 'USERNAME_EXISTS') {
        setError("This username is already taken");
      } else if (err.code === 'EMAIL_EXISTS') {
        setError("This email address is already in use");
      } else if (err.code === 'INVALID_PASSWORD') {
        setError("Current password is incorrect");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Update Profile</h2>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError("")}>
                  {error}
                </Alert>
              )}
              {message && (
                <Alert variant="success">
                  {message}
                  <div className="mt-2">
                    <small>Redirecting to dashboard...</small>
                  </div>
                </Alert>
              )}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter new username"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter new email"
                  />
                </Form.Group>

                <hr className="my-4" />

                <Form.Group className="mb-3" controlId="currentPassword">
                  <Form.Label>Current Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    required
                    placeholder="Enter current password"
                  />
                  <Form.Text className="text-muted">
                    Required to make any changes to your profile
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="Enter new password (optional)"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Confirm New Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm new password"
                    disabled={!formData.newPassword}
                  />
                </Form.Group>

                <Button
                  type="submit"
                  className="w-100"
                  disabled={loading || message}
                >
                  {loading ? "Updating Profile..." : "Update Profile"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;