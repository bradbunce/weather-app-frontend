import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import WeatherCard from './WeatherCard';
import { useAuth } from '../context/AuthContext';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;

const Dashboard = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    console.log('Auth state:', {
      isAuthenticated: !!user,
      username: user?.username,
      hasToken: !!user?.token
    });
    
    fetchLocations();
  }, [user]);

  const getAuthHeaders = () => {
    if (!user?.token) return {};
    return {
      'Authorization': `HS256 ${user.token}`,  // Using the specific algorithm name
      'Content-Type': 'application/json'
    };
  };

  const fetchLocations = async () => {
    if (!user?.username) {
      console.log('No user data, skipping locations fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching locations for user:', user.username);
      console.log('Using headers:', getAuthHeaders());
      
      const response = await axios.get(`${LOCATIONS_API_URL}/locations/${user.username}`, {
        headers: getAuthHeaders()
      });
      
      console.log('Locations response:', response.data);
      
      if (response.data?.locations) {
        setLocations(response.data.locations);
      } else if (Array.isArray(response.data)) {
        setLocations(response.data);
      } else {
        console.warn('Unexpected locations data format:', response.data);
        setLocations([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching locations:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Failed to fetch locations';
      
      if (err.response?.status === 403) {
        errorMessage = 'Authentication error. Please check your login status.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const addLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim() || !user?.username) return;

    try {
      console.log('Adding location:', {
        username: user.username,
        location: newLocation.trim()
      });
      
      const response = await axios.post(`${LOCATIONS_API_URL}/locations`, {
        username: user.username,
        location: newLocation.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Add location response:', response.data);
      
      let addedLocation;
      if (response.data?.location) {
        addedLocation = response.data.location;
      } else if (response.data?.id) {
        addedLocation = response.data;
      } else {
        console.error('Invalid location data received:', response.data);
        throw new Error('Invalid location data received from server');
      }
      
      setLocations(prevLocations => [...prevLocations, addedLocation]);
      setNewLocation('');
      setError('');
      
      // Refresh locations list to ensure consistency
      fetchLocations();
    } catch (err) {
      console.error('Error adding location:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Failed to add location';
      
      if (err.response?.status === 403) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    }
  };

  const removeLocation = async (locationId) => {
    if (!user?.username) return;

    try {
      console.log('Removing location:', locationId);
      
      await axios.delete(`${LOCATIONS_API_URL}/locations/${locationId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setLocations(prevLocations => 
        prevLocations.filter(loc => loc.id !== locationId)
      );
      
      // Refresh locations list to ensure consistency
      fetchLocations();
    } catch (err) {
      console.error('Error removing location:', {
        locationId,
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      
      let errorMessage = 'Failed to remove location';
      
      if (err.response?.status === 403) {
        errorMessage = 'Authentication error. Please try logging in again.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    }
  };

  // Development only debug panel
  const DebugPanel = () => {
    if (process.env.NODE_ENV === 'production') return null;
    
    return (
      <div className="mb-3 p-2 bg-light border rounded">
        <small>
          <pre className="mb-0">
            {JSON.stringify({
              userExists: !!user,
              username: user?.username,
              hasToken: !!user?.token,
              apiUrl: LOCATIONS_API_URL,
              locationCount: locations.length
            }, null, 2)}
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

  if (loading) {
    return (
      <Container>
        <div className="text-center my-4">Loading...</div>
      </Container>
    );
  }

  return (
    <Container>
      <DebugPanel />
      
      <h2 className="mb-4">My Weather Dashboard</h2>
      
      <Form onSubmit={addLocation} className="mb-4">
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
        <Alert 
          variant="danger" 
          dismissible 
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Row xs={1} md={2} lg={3} className="g-4">
        {locations.map(location => (
          <Col key={location.id}>
            <WeatherCard
              location={location}
              onRemove={() => removeLocation(location.id)}
            />
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

export default Dashboard;