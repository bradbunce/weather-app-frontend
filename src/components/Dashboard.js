import React, { useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { useLocations } from "../contexts/LocationsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLogger } from "../utils/logger";
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Grid component for displaying weather location cards
 * Memoized to prevent unnecessary re-renders
 */
const LocationGrid = React.memo(({ locations, onRemove }) => {
  const logger = useLogger();

  logger.debug('Rendering LocationGrid', { locationCount: locations.length });

  return (
    <Row xs={1} md={2} lg={3} className="g-4">
      {locations.map((location) => (
        <Col key={location.location_id}>
          <WeatherCard location={location} onRemove={onRemove} />
        </Col>
      ))}
    </Row>
  );
}, (prevProps, nextProps) => {
  const logger = useLogger();
  // Check if re-render is needed
  const locationLengthChanged = prevProps.locations.length !== nextProps.locations.length;
  if (locationLengthChanged) {
    logger.debug('LocationGrid needs update - location count changed', {
      prev: prevProps.locations.length,
      next: nextProps.locations.length
    });
    return false;
  }

  const locationsUnchanged = prevProps.locations.every((loc, i) => 
    loc.location_id === nextProps.locations[i].location_id
  );

  logger.debug('LocationGrid memo check', { 
    shouldUpdate: !locationsUnchanged
  });

  return locationsUnchanged;
});

/**
 * Form component for adding new weather locations
 * Handles geocoding and location validation
 */
const FormSection = React.memo(({ onAdd }) => {
  const [newLocation, setNewLocation] = useState("");
  const logger = useLogger();
  
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    
    logger.debug('Submitting new location', { location: newLocation });
    
    try {
      // Geocode the location
      logger.debug('Geocoding location');
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
        logger.warn('Location not found', { searchTerm: newLocation });
        throw new Error("Could not find location details");
      }

      // Format location data
      const newLocationData = {
        city_name: locationData.display_name.split(",")[0].trim(),
        country_code: locationData.address?.country_code?.toUpperCase() || "US",
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon),
      };

      logger.debug('Adding new location', newLocationData);
      await onAdd(newLocationData);
      setNewLocation("");
    } catch (err) {
      logger.error('Error adding location', { 
        error: err.message,
        searchTerm: newLocation 
      });
    }
  }, [newLocation, onAdd, logger]);

  logger.debug('Rendering FormSection');

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <Row className="align-items-center g-2">
        <Col xs={12} sm={8} md={6}>
          <Form.Group>
            <Form.Control
              type="text"
              placeholder="Enter city name"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="text-content w-100"
            />
          </Form.Group>
        </Col>
        <Col xs={12} sm={4} md={2}>
          <Button
            type="submit"
            variant="primary"
            disabled={!newLocation.trim()}
            className="text-content w-100"
          >
            Add Location
          </Button>
        </Col>
      </Row>
    </Form>
  );
});

/**
 * Debug information panel - only shown in development
 * Displays current user and location state
 */
const DebugPanel = React.memo(({ user, locations }) => {
  const logger = useLogger();

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const debugInfo = {
    userExists: !!user,
    username: user?.username,
    hasToken: !!user?.token,
    locationCount: locations.length,
  };

  logger.debug('Debug panel info', debugInfo);

  return (
    <div className="mb-3 p-2 bg-light border rounded text-small">
      <small>
        <pre className="mb-0">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </small>
    </div>
  );
});

/**
 * Main Dashboard component
 * Manages weather locations and user interface
 */
export const Dashboard = () => {
  // Hooks
  const { theme } = useTheme();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { 
    locations, 
    isLoading, 
    error, 
    addLocation, 
    removeLocation, 
    clearError 
  } = useLocations();
  const logger = useLogger();

  // Memoized callbacks
  const memoizedRemoveLocation = useCallback(locationId => {
    logger.debug('Removing location', { locationId });
    removeLocation(locationId);
  }, [removeLocation, logger]);

  // Memoized dashboard content
  const dashboardContent = useMemo(() => {
    logger.debug('Computing dashboard content', {
      isAuthLoading,
      isLoading,
      hasUser: !!user,
      locationCount: locations.length
    });
    // Handle loading states
    if (isAuthLoading) {
      logger.debug('Auth still loading');
      return null;
    }

    // Handle unauthenticated state
    if (!user) {
      logger.info('User not authenticated');
      return (
        <Alert variant="warning" className="text-content">
          Please log in to view your weather dashboard.
        </Alert>
      );
    }

    // Handle locations loading
    if (isLoading) {
      logger.debug('Loading locations');
      logger.debug('Rendering main dashboard content');
    
    return (
        <div className="d-flex justify-content-center py-5 text-content">
          <LoadingSpinner />
        </div>
      );
    }

    return (
      <>
        <DebugPanel user={user} locations={locations} />
        <h2 className="mb-4 text-title">My Weather Dashboard</h2>
        
        <FormSection onAdd={addLocation} />

        {error && (
          <Alert variant="danger" dismissible onClose={clearError} className="text-content">
            {error}
          </Alert>
        )}

        <LocationGrid 
          locations={locations} 
          onRemove={memoizedRemoveLocation} 
        />

        {/* Show empty state message if no locations */}
        {locations.length === 0 && !error && (
          <Alert variant="info" className="text-content">
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
    logger
  ]);

  return (
    <Container className={`theme-${theme} dashboard-container`}>
      {dashboardContent}
    </Container>
  );
};
