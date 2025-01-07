import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import WeatherCard from './WeatherCard';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      // This will be replaced with actual API call to Lambda
      // const response = await axios.get(`YOUR_LAMBDA_API_ENDPOINT/locations/${user.username}`);
      // setLocations(response.data);
      
      // Temporary mock data
      setLocations([
        { id: 1, name: 'New York', country: 'US' },
        { id: 2, name: 'London', country: 'UK' }
      ]);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch locations');
      setLoading(false);
    }
  };

  const addLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.trim()) return;

    try {
      // This will be replaced with actual API call to Lambda
      // const response = await axios.post('YOUR_LAMBDA_API_ENDPOINT/locations', {
      //   username: user.username,
      //   location: newLocation
      // });
      
      // Temporary mock implementation
      const mockNewLocation = {
        id: locations.length + 1,
        name: newLocation,
        country: 'US'
      };
      
      setLocations([...locations, mockNewLocation]);
      setNewLocation('');
      setError('');
    } catch (err) {
      setError('Failed to add location');
    }
  };

  const removeLocation = async (locationId) => {
    try {
      // This will be replaced with actual API call to Lambda
      // await axios.delete(`YOUR_LAMBDA_API_ENDPOINT/locations/${locationId}`);
      
      setLocations(locations.filter(loc => loc.id !== locationId));
    } catch (err) {
      setError('Failed to remove location');
    }
  };

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
            <Button type="submit" variant="primary">
              Add Location
            </Button>
          </Col>
        </Row>
      </Form>

      {error && <Alert variant="danger">{error}</Alert>}

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
    </Container>
  );
};

export default Dashboard;