import React, { useState, useCallback } from "react";
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
import axios from "axios";
import { useLogger } from "../utils/logger";

// Constants
const AUTH_API_URL = process.env.REACT_APP_AUTH_API;

// Utility functions
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Register component
 * Handles new user registration with email validation
 */

export const Register = () => {
  // Hooks
  const navigate = useNavigate();
  const logger = useLogger();

  // State management
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    logger.debug('Attempting registration', { 
      username: formData.username,
      email: formData.email 
    });
    
    // Form validation
    if (formData.password !== formData.confirmPassword) {
      logger.warn('Password mismatch during registration');
      return setError("Passwords do not match");
    }

    if (!validateEmail(formData.email)) {
      logger.warn('Invalid email format', { email: formData.email });
      return setError("Please enter a valid email address");
    }

    try {
      setError("");
      setLoading(true);
      
      logger.debug('Sending registration request');
      const response = await axios.post(`${AUTH_API_URL}/register`, {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }
      
      logger.info('Registration successful', { 
        username: formData.username 
      });
      navigate("/login");
    } catch (err) {
      logger.error('Registration failed', {
        error: err.message,
        username: formData.username
      });
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create an account"
      );
    } finally {
      setLoading(false);
    }
  }, [formData, navigate, logger]);

  // Handle form input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    logger.debug('Updating registration form', { field: name });
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, [logger]);

  // Handle error dismissal
  const handleDismissError = useCallback(() => {
    logger.debug('Dismissing registration error');
    setError("");
  }, [logger]);

  logger.debug('Rendering registration form');

  return (
    <Container className="register-container">
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h2 className="text-center mb-4">Register</h2>
              {error && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={handleDismissError}
                >
                  {error}
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
                    required
                    autoComplete="username"
                    placeholder="Choose a username"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    placeholder="Enter your email"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="Enter password"
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="Confirm password"
                  />
                </Form.Group>

                <Button className="w-100" type="submit" disabled={loading}>
                  {loading ? "Creating Account..." : "Register"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
