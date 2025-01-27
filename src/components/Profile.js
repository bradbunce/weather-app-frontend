import React, { useState, useEffect, useCallback } from "react";
import {
  Form,
  Button,
  Card,
  Alert,
  Container,
  Row,
  Col,
  Spinner
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLogger } from "../utils/logger";

// Utility functions
const validatePassword = (newPassword, confirmPassword) => {
  return !newPassword || newPassword === confirmPassword;
};

const validateUsername = (username) => {
  return !username || (username.length >= 3 && username.length <= 50);
};

const validateEmail = (email) => {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Profile component
 * Handles user profile updates including password changes
 */
const Profile = () => {
  // Hooks
  const { updatePassword, updateProfile, currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const logger = useLogger();

  // State management
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

  // Authentication check and redirect
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      logger.info("Unauthenticated user accessing profile, redirecting to login");
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, logger]);

  // Load user data
  useEffect(() => {
    if (currentUser) {
      logger.debug("Loading user profile data", {
        username: currentUser.username,
        email: currentUser.email
      });
      setFormData(prev => ({
        ...prev,
        username: currentUser.username || "",
        email: currentUser.email || "",
      }));
    } else {
      logger.debug("No user data available");
    }
  }, [currentUser, logger]);

  // Form validation
  const validateForm = useCallback(() => {
    logger.debug("Validating profile form", {
      hasNewPassword: !!formData.newPassword,
      username: formData.username,
      email: formData.email
    });

    if (!validatePassword(formData.newPassword, formData.confirmPassword)) {
      logger.warn("Password validation failed - passwords don't match");
      setError("Passwords do not match");
      return false;
    }

    if (!validateUsername(formData.username)) {
      logger.warn("Username validation failed", { username: formData.username });
      setError("Username must be between 3 and 50 characters");
      return false;
    }

    if (!validateEmail(formData.email)) {
      logger.warn("Email validation failed", { email: formData.email });
      setError("Please enter a valid email address");
      return false;
    }

    return true;
  }, [formData, logger]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    logger.debug("Profile update initiated", { 
      hasPasswordUpdate: !!formData.newPassword,
      hasProfileChanges: formData.username !== currentUser?.username || formData.email !== currentUser?.email
    });

    if (!validateForm()) {
      return;
    }

    try {
      setError("");
      setMessage("");
      setLoading(true);

      const updatePromises = [];

      // Queue password update if needed
      if (formData.newPassword) {
        logger.debug("Queueing password update");
        updatePromises.push(updatePassword(formData.currentPassword, formData.newPassword));
      }

      // Queue profile update if needed
      if (formData.username !== currentUser?.username || formData.email !== currentUser?.email) {
        logger.debug("Queueing profile update", {
          usernameChanged: formData.username !== currentUser?.username,
          emailChanged: formData.email !== currentUser?.email
        });
        
        updatePromises.push(
          updateProfile({
            username: formData.username,
            email: formData.email,
            currentPassword: formData.currentPassword
          })
        );
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        logger.info("Profile updated successfully");
        setMessage("Profile updated successfully!");

        // Reset sensitive form fields
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));

        // Redirect after short delay
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else {
        logger.debug("No profile changes detected");
        setMessage("No changes were made to update");
      }
    } catch (error) {
      logger.error("Profile update failed", { error: error.message });
      setError(error.message || "An error occurred while updating your profile");
    } finally {
      setLoading(false);
    }
  }, [formData, currentUser, updatePassword, updateProfile, validateForm, navigate, logger]);

  // Handle form input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    logger.debug("Updating profile form field", { field: name });
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, [logger]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    logger.debug("Dismissing profile error");
    setError("");
  }, [logger]);

  // Loading state
  if (isLoading) {
    logger.debug("Showing auth loading spinner");
    return (
      <Container className="profile-container">
        <Row className="justify-content-md-center">
          <Col md={6} className="text-center mt-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </Col>
        </Row>
      </Container>
    );
  }

  // No user data state
  if (!currentUser) {
    logger.warn("Attempting to render profile without user data");
    return (
      <Container className="profile-container">
        <Row className="justify-content-md-center">
          <Col md={6}>
            <Alert variant="warning">
              Unable to load user data. Please try logging in again.
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
      <Container className="profile-container">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Update Profile</h2>
              {error && (
                <Alert variant="danger" dismissible onClose={handleDismissError}>
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
                  <Form.Label>New Password (Optional)</Form.Label>
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
