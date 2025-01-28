import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Container, Row, Col, Button, Form, Alert, ListGroup } from "react-bootstrap";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { useLocations } from "../contexts/LocationsContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLogger } from "@bradbunce/launchdarkly-react-logger";
import { useWebSocket } from "../contexts/WebSocketContext";
import { LoadingSpinner } from './LoadingSpinner';

/**
 * Grid component for displaying weather location cards
 * Memoized to prevent unnecessary re-renders
 */
const LocationGrid = React.memo(({ locations, onRemove }) => {
  const logger = useLogger();

  useEffect(() => {
    logger.debug('LocationGrid rendered', { locationCount: locations.length });
  }, [locations.length, logger]);

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
  // Check if re-render is needed
  const locationLengthChanged = prevProps.locations.length !== nextProps.locations.length;
  if (locationLengthChanged) {
    return false;
  }

  return prevProps.locations.every((loc, i) => 
    loc.location_id === nextProps.locations[i].location_id
  );
});

/**
 * Form component for adding new weather locations
 * Handles geocoding and location validation
 */
const FormSection = React.memo(({ onAdd }) => {
  const [newLocation, setNewLocation] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const logger = useLogger();
  
  const handleSearch = useCallback(async () => {
    if (!newLocation.trim()) return;
    
    setIsSearching(true);
    setSearchError("");
    logger.debug('Searching for location', { location: newLocation });
    
    try {
      const geocodingResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            q: newLocation.trim(),
            format: "json",
            limit: 5, // Get up to 5 matches
          },
        }
      );

      if (geocodingResponse.data.length === 0) {
        setSearchError("No locations found. Please try a different search term.");
        setSearchResults([]);
      } else {
        setSearchResults(geocodingResponse.data.map(location => ({
          display_name: location.display_name,
          city_name: location.display_name.split(",")[0].trim(),
          country_code: location.address?.country_code?.toUpperCase() || "US",
          latitude: parseFloat(location.lat),
          longitude: parseFloat(location.lon),
        })));
      }
    } catch (err) {
      logger.error('Error searching location', { 
        error: err.message,
        searchTerm: newLocation 
      });
      setSearchError("Error searching for location. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [newLocation, logger]);

  const webSocket = useWebSocket();

  const handleLocationSelect = useCallback(async (locationData) => {
    try {
      logger.debug('Adding selected location', locationData);
      await onAdd({
        city_name: locationData.city_name,
        country_code: locationData.country_code,
        latitude: locationData.latitude,
        longitude: locationData.longitude
      });
      
      // Get the newly added location's ID from the updated locations list
      const token = localStorage.getItem("authToken");
      if (token && webSocket) {
        // Request weather data for all locations to ensure we get data for the new one
        webSocket.subscribeAllLocations(token);
      }

      setNewLocation("");
      setSearchResults([]);
      setSearchError("");
    } catch (err) {
      logger.error('Error adding location', { 
        error: err.message,
        location: locationData 
      });
      setSearchError("Error adding location. Please try again.");
    }
  }, [onAdd, logger, webSocket]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSearch();
  }, [handleSearch]);

  useEffect(() => {
    logger.debug('FormSection rendered');
  }, [logger]);

  return (
    <div className="mb-4">
      <Form onSubmit={handleSubmit}>
        <Row className="align-items-center g-2 mb-3">
          <Col xs={12} sm={8} md={6}>
            <Form.Group>
              <Form.Control
                type="text"
                placeholder="Enter city name, state, or country"
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
              disabled={!newLocation.trim() || isSearching}
              className="text-content w-100"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </Col>
        </Row>
      </Form>

      {searchError && (
        <Alert variant="danger" className="mb-3">
          {searchError}
        </Alert>
      )}

      {searchResults.length > 0 && (
        <ListGroup className="mb-3">
          {searchResults.map((result, index) => (
            <ListGroup.Item
              key={index}
              action
              onClick={() => handleLocationSelect(result)}
              className="text-content"
            >
              <div className="d-flex flex-column">
                <strong>{result.city_name}</strong>
                <small className="text-muted">{result.display_name}</small>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </div>
  );
});

/**
 * Debug information panel - only shown in development
 * Displays current user and location state
 */
const DebugPanel = React.memo(({ user, locations }) => {
  const logger = useLogger();

  // Memoize debug info to prevent unnecessary effect triggers
  const debugInfo = useMemo(() => ({
    userExists: !!user,
    username: user?.username,
    hasToken: !!user?.token,
    locationCount: locations.length,
  }), [user, locations.length]);

  // Log debug info when it changes
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      logger.debug('Debug panel info', debugInfo);
    }
  }, [debugInfo, logger]);

  if (process.env.NODE_ENV === "production") {
    return null;
  }

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

  // Log dashboard state changes
  useEffect(() => {
    logger.debug('Dashboard state updated', {
      isAuthLoading,
      isLoading,
      hasUser: !!user,
      locationCount: locations.length,
      hasError: !!error
    });
  }, [isAuthLoading, isLoading, user, locations.length, error, logger]);

  const dashboardContent = useMemo(() => {
    // Handle loading states
    if (isAuthLoading) {
      return null;
    }

    // Handle unauthenticated state
    if (!user) {
      return (
        <Alert variant="warning" className="text-content">
          Please log in to view your weather dashboard.
        </Alert>
      );
    }

    // Handle locations loading
    if (isLoading) {
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
    addLocation
  ]);

  return (
    <Container className={`theme-${theme} dashboard-container`}>
      {dashboardContent}
    </Container>
  );
};
