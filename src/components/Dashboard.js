import React, { useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import { Maximize2, Minimize2 } from "lucide-react";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { useLocations } from "../contexts/LocationsContext";
import { LoadingSpinner } from './LoadingSpinner';

const ViewToggle = React.memo(({ showDetailedView, onToggle }) => (
  <div className="d-flex justify-content-end mb-3">
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={onToggle}
      className="d-flex align-items-center gap-2"
    >
      {showDetailedView ? (
        <>
          <Minimize2 size={16} />
          Basic View
        </>
      ) : (
        <>
          <Maximize2 size={16} />
          Detailed View
        </>
      )}
    </Button>
  </div>
));

const LocationGrid = React.memo(({ locations, onRemove, showDetailedView }) => (
  <Row xs={1} md={2} lg={3} className="g-4">
    {locations.map((location) => (
      <Col key={location.location_id}>
        <WeatherCard 
          location={location} 
          onRemove={onRemove}
          showDetailed={showDetailedView} 
        />
      </Col>
    ))}
  </Row>
), (prevProps, nextProps) => {
  if (prevProps.locations.length !== nextProps.locations.length) return false;
  if (prevProps.showDetailedView !== nextProps.showDetailedView) return false;
  return prevProps.locations.every((loc, i) => 
    loc.location_id === nextProps.locations[i].location_id
  );
});

const FormSection = React.memo(({ onAdd }) => {
  const [newLocation, setNewLocation] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    
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
        country_code: locationData.address?.country_code?.toUpperCase() || "US",
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon),
      };

      await onAdd(newLocationData);
      setNewLocation("");
    } catch (err) {
      console.error("Error adding location:", err);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
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
  );
});

const DebugPanel = React.memo(({ user, locations }) => {
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
});

export const Dashboard = () => {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    locations, 
    isLoading, 
    error, 
    addLocation, 
    removeLocation, 
    clearError 
  } = useLocations();

  const memoizedRemoveLocation = useCallback(locationId => {
    removeLocation(locationId);
  }, [removeLocation]);

  const toggleView = useCallback(() => {
    setShowDetailedView(prev => !prev);
  }, []);

  const dashboardContent = useMemo(() => {
    if (isAuthLoading) return null;

    if (!user) {
      return (
        <Alert variant="warning">
          Please log in to view your weather dashboard.
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner />
        </div>
      );
    }

    return (
      <>
        <DebugPanel user={user} locations={locations} />
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0">My Weather Dashboard</h2>
          {locations.length > 0 && (
            <ViewToggle 
              showDetailedView={showDetailedView} 
              onToggle={toggleView}
            />
          )}
        </div>
        
        <FormSection onAdd={addLocation} />

        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error}
          </Alert>
        )}

        <LocationGrid 
          locations={locations} 
          onRemove={memoizedRemoveLocation}
          showDetailedView={showDetailedView}
        />

        {locations.length === 0 && !error && (
          <Alert variant="info">
            No locations added yet. Add a city to get started!
          </Alert>
        )}
      </>
    );
  }, [
    user,
    isAuthLoading,
    isLoading,
    locations,
    error,
    clearError,
    memoizedRemoveLocation,
    addLocation,
    showDetailedView,
    toggleView
  ]);

  return <Container>{dashboardContent}</Container>;
};