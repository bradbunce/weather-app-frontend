import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";

export const Home = () => {
  return (
    <Container className="text-center home-container">
      <Row className="justify-content-center">
        <Col md={8}>
          <h1 className="mb-4">Welcome to Weather App</h1>
          <p className="lead mb-4">
            Track weather information for your favorite locations
          </p>
          <div>
            <Button
              as={Link}
              to="/register"
              variant="primary"
              size="lg"
              className="me-3"
            >
              Get Started
            </Button>
            <Button as={Link} to="/login" variant="outline-primary" size="lg">
              Login
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
};
