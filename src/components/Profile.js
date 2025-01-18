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

  useEffect(() => {
    // Only update form data if currentUser exists and has necessary properties
    if (currentUser) {
      console.log("Current user data:", currentUser); // Debug log
      setFormData(prev => ({
        ...prev,
        username: currentUser.username || "",
        email: currentUser.email || "",
      }));
    } else {
      console.log("No current user data available"); // Debug log
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
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Please enter a valid email address");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submission started", { formData }); // Debug log

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
        console.log("Adding password update to queue"); // Debug log
        updatePromises.push(updatePassword(formData.currentPassword, formData.newPassword));
      }

      // Handle profile updates (username and email)
      const currentUsername = currentUser?.username;
      const currentEmail = currentUser?.email;
      
      if (formData.username !== currentUsername || formData.email !== currentEmail) {
        console.log("Adding profile update to queue", { // Debug log
          currentUsername,
          newUsername: formData.username,
          currentEmail,
          newEmail: formData.email
        });
        
        updatePromises.push(
          updateProfile({
            username: formData.username,
            email: formData.email,
            currentPassword: formData.currentPassword
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
      } else {
        console.log("No changes detected to update"); // Debug log
        setMessage("No changes were made to update");
      }
    } catch (error) {
      console.error("Profile update error:", error); // Debug log
      setError(error.message || "An error occurred while updating your profile");
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

  if (!currentUser) {
    console.log("Component rendered without user data"); // Debug log
    return (
      <Container>
        <Row className="justify-content-md-center">
          <Col md={6}>
            <Alert variant="warning">
              Loading user data...
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