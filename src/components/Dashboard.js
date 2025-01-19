import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { useLocations } from "../contexts/LocationsContext";
import { LoadingSpinner } from './LoadingSpinner';

export const Dashboard = () => {
  const [newLocation, setNewLocation] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);
  const { user } = useAuth();
  const { 
    locations, 
    isLoading, 
    error, 
    addLocation, 
    removeLocation, 
    clearError 
  } = useLocations();

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => {
        setShowSpinner(true);
      }, 2000);
    } else {
      setShowSpinner(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading]);

  const getCountryCode = (displayName) => {
    const parts = displayName.split(",");
    const countryPart = parts[parts.length - 1].trim();

    const countryCodeMap = {
      "United States": "US",
      "United States of America": "US",
      USA: "US",
      Canada: "CA",
      "United Kingdom": "GB",
      UK: "GB",
      "Great Britain": "GB",
    };

    return countryCodeMap[countryPart] || "US";
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim() || !user?.username) return;

    try {
      const geocodingResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: newLocation.trim(),
            format: "json",
            limit: 1,
          },
        }
      );

      const locationData = geocodingResponse.data[0];

      if (!locationData) {
        throw new Error("Could not find location details");
      }

      const newLocationData = {
        city_name: locationData.display_name.split(",")[0].trim(),
        country_code: getCountryCode(locationData.display_name),
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon),
      };

      await addLocation(newLocationData);
      setNewLocation("");
    } catch (err) {
      console.error("Error adding location:", err);
    }
  };

  const DebugPanel = () => {
    if (process.env.NODE_ENV === "production") return null;

    return (
      <div className="mb-3 p-2 bg-light border rounded">
        <small>
          <pre className="mb-0">
            {JSON.stringify(
              {
                userExists: !!user,
                username: user?.username,
                hasToken: !!user?.token,
                locationCount: locations.length,
              },
              null,
              2
            )}
          </pre>
        </small>
      </div>
    );
  };

  if (!user) {
    return (
      <Container>
        <Alert variant="warning">
          Please log in to view your weather dashboard.
        </Alert>
      </Container>
    );
  }

  // If still loading, show spinner
  if (isLoading) {
    return (
      <Container>
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <DebugPanel />

      <h2 className="mb-4">My Weather Dashboard</h2>

      <Form onSubmit={handleAddLocation} className="mb-4">
        <Row className="align-items-center">
          <Col sm={8} md={6}>
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Enter city name"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col sm={4} md={2}>
            <Button
              type="submit"
              variant="primary"
              disabled={!newLocation.trim()}
            >
              Add Location
            </Button>
          </Col>
        </Row>
      </Form>

      {error && (
        <Alert variant="danger" dismissible onClose={clearError}>
          {error}
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {locations.map((location) => (
          <Col key={location.location_id}>
            <WeatherCard location={location} onRemove={removeLocation} />
          </Col>
        ))}
      </Row>

      {locations.length === 0 && !error && (
        <Alert variant="info">
          No locations added yet. Add a city to get started!
        </Alert>
      )}
    </Container>
  );
};