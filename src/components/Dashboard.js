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
    fetchLocations();
  }, [user]);

  const fetchLocations = async () => {
    if (!user?.username) return;

    try {
      const response = await axios.get(`${LOCATIONS_API_URL}/locations/${user.username}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      setLocations(response.data.locations || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err.response?.data?.message || 'Failed to fetch locations');
      setLoading(false);
    }
  };

  const addLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim() || !user?.username) return;

    try {
      const response = await axios.post(`${LOCATIONS_API_URL}/locations`, {
        username: user.username,
        location: newLocation.trim()
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      // Debug logging
      console.log('Add location response:', response.data);
      
      // Check the structure of the response
      const addedLocation = response.data.location || response.data;
      
      // Ensure we have an id before adding to state
      if (!addedLocation.id) {
        console.error('Missing id in response:', addedLocation);
        throw new Error('Invalid location data received');
      }
      
      setLocations(prevLocations => [...prevLocations, addedLocation]);
      setNewLocation('');
      setError('');
    } catch (err) {
      console.error('Error adding location:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to add location');
    }
  };

  const removeLocation = async (locationId) => {
    if (!user?.username) return;

    try {
      await axios.delete(`${LOCATIONS_API_URL}/locations/${locationId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      
      setLocations(prevLocations => 
        prevLocations.filter(loc => loc.id !== locationId)
      );
    } catch (err) {
      console.error('Error removing location:', err);
      setError(err.response?.data?.message || 'Failed to remove location');
    }
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