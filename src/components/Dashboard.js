import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { useLocations } from "../contexts/LocationsContext";
import { LoadingSpinner } from './LoadingSpinner';

const LocationGrid = React.memo(({ locations, onRemove }) => (
  <Row xs={1} md={2} lg={3} className="g-4">
    {locations.map((location) => (
      <Col key={location.location_id}>
        <WeatherCard location={location} onRemove={onRemove} />
      </Col>
    ))}
  </Row>
), (prevProps, nextProps) => {
  if (prevProps.locations.length !== nextProps.locations.length) return false;
  return prevProps.locations.every((loc, i) => 
    loc.location_id === nextProps.locations[i].location_id
  );
});

const FormSection = React.memo(({ handleAddLocation, newLocation, setNewLocation }) => (
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
));

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
  const [newLocation, setNewLocation] = useState("");
  const [showSpinner, setShowSpinner] = useState(false);
  const [showNoLocations, setShowNoLocations] = useState(false);
  const { user } = useAuth();
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

  const handleAddLocation = useCallback(async (e) => {
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
        country_code: locationData.address?.country_code?.toUpperCase() || "US",
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon),
      };

      await addLocation(newLocationData);
      setNewLocation("");
    } catch (err) {
      console.error("Error adding location:", err);
    }
  }, [newLocation, user?.username, addLocation]);

  useEffect(() => {
    console.log('Loading effect triggered:', { 
      isLoading, 
      locationsCount: locations.length, 
      error 
    });
  
    let loadingTimer;
    let noLocationsTimer;
  
    if (isLoading) {
      console.log('Setting loading timer');
      loadingTimer = setTimeout(() => {
        console.log('Loading timer fired - showing spinner');
        setShowSpinner(true);
      }, 2000);
    } else {
      console.log('Clearing spinner');
      setShowSpinner(false);
  
      if (locations.length === 0 && !error) {
        console.log('Setting no locations timer');
        noLocationsTimer = setTimeout(() => {
          console.log('No locations timer fired');
          setShowNoLocations(true);
        }, 2000);
      } else {
        console.log('Hiding no locations alert');
        setShowNoLocations(false);
      }
    }
  
    return () => {
      console.log('Cleanup - clearing timers');
      clearTimeout(loadingTimer);
      clearTimeout(noLocationsTimer);
    };
  }, [isLoading, locations.length, error]);

  const dashboardContent = useMemo(() => {
    console.log('Recalculating dashboardContent with deps:', {
      userExists: !!user,
      showSpinner,
      locationsCount: locations.length,
      newLocation,
      error,
      showNoLocations
    });
  
    if (!user) {
      console.log('User not logged in - showing warning');
      return (
        <Alert variant="warning">
          Please log in to view your weather dashboard.
        </Alert>
      );
    }
  
    if (showSpinner) {
      console.log('Showing spinner');
      return (
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner />
        </div>
      );
    }
  
    console.log('Rendering main dashboard content');
    return (
      <>
        <DebugPanel user={user} locations={locations} />
        <h2 className="mb-4">My Weather Dashboard</h2>
        
        <FormSection
          handleAddLocation={handleAddLocation}
          newLocation={newLocation}
          setNewLocation={setNewLocation}
        />
  
        {error && (
          <Alert variant="danger" dismissible onClose={clearError}>
            {error}
          </Alert>
        )}
  
        <LocationGrid
          locations={locations}
          onRemove={memoizedRemoveLocation}
        />
  
        {showNoLocations && (
          <Alert variant="info">
            No locations added yet. Add a city to get started!
          </Alert>
        )}
      </>
    );
  }, [
    user,
    showSpinner,
    locations,
    handleAddLocation,
    newLocation,
    error,
    clearError,
    memoizedRemoveLocation,
    showNoLocations
  ]);

  return <Container>{dashboardContent}</Container>;
};