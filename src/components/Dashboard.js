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

  // Step 1: Add axios interceptors for request/response debugging
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(request => {
      // Check if Authorization header matches the user's token
      const currentToken = user?.token;
      const requestToken = request.headers?.Authorization?.replace('Bearer ', '');
      
      console.log('🚀 Starting Request:', {
        url: request.url,
        method: request.method,
        headers: request.headers,
        tokenMatch: currentToken === requestToken
      });
      return request;
    });

    const responseInterceptor = axios.interceptors.response.use(
      response => {
        console.log('✅ Response:', response);
        return response;
      },
      error => {
        console.log('❌ Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          corsHeaders: {
            'Access-Control-Allow-Origin': error.response?.headers?.['access-control-allow-origin'],
            'Access-Control-Allow-Headers': error.response?.headers?.['access-control-allow-headers'],
            'Access-Control-Allow-Methods': error.response?.headers?.['access-control-allow-methods']
          }
        });
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors on unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [user?.token]);

  useEffect(() => {
    // Step 2: Enhanced auth debugging
    console.log('🔐 Auth state:', {
      isAuthenticated: !!user,
      username: user?.username,
      hasToken: !!user?.token
    });

    // Step 3: Token validation and structure debugging
    if (user?.token) {
      try {
        const [header, payload, signature] = user.token.split('.');
        const tokenPayload = JSON.parse(atob(payload));
        const tokenExpiryDate = new Date(tokenPayload.exp * 1000);
        
        console.log('🎟️ Token debug:', {
          tokenLength: user.token.length,
          tokenStart: user.token.substring(0, 20) + '...',
          tokenPayload,
          tokenExpiry: tokenExpiryDate,
          isExpired: tokenExpiryDate < new Date()
        });

        console.log('🔍 Token Structure:', {
          header: JSON.parse(atob(header)),
          payload: tokenPayload,
          signatureLength: signature.length
        });

        // Check if token in localStorage matches
        const storedToken = localStorage.getItem('authToken');
        console.log('💾 Token Storage Check:', {
          tokensMatch: storedToken === user.token,
          userTokenLength: user.token?.length,
          storedTokenLength: storedToken?.length
        });

      } catch (err) {
        console.error('Token parsing error:', err);
      }
    }
    
    fetchLocations();
  }, [user]);

  const getAuthHeaders = () => {
    if (!user?.token) {
      console.warn('⚠️ No auth token available');
      return {};
    }
    // Get the token directly from localStorage to ensure freshness
    const freshToken = localStorage.getItem('authToken');
    if (freshToken !== user.token) {
      console.warn('⚠️ Token mismatch between user object and localStorage');
    }
    return {
      'Authorization': `Bearer ${freshToken || user.token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchLocations = async () => {
    if (!user?.username) {
      console.log('👤 No user data, skipping locations fetch');
      setLoading(false);
      return;
    }
  
    try {
      // Step 4: API configuration debugging
      console.log('🌐 API Configuration:', {
        baseURL: LOCATIONS_API_URL,
        fullURL: `${LOCATIONS_API_URL}/locations`,
        headers: getAuthHeaders()
      });
  
      const response = await axios.get(`${LOCATIONS_API_URL}/locations`, {
        headers: getAuthHeaders()
      });
  
      // Add detailed logging of the response data
      console.log('📍 Raw locations response:', response.data);
  
      let locationData;
      if (response.data?.locations) {
        locationData = response.data.locations;
        console.log('📍 Locations from nested property:', locationData);
      } else if (Array.isArray(response.data)) {
        locationData = response.data;
        console.log('📍 Locations from direct array:', locationData);
      } else {
        console.warn('⚠️ Unexpected locations data format:', response.data);
        locationData = [];
      }
  
      // Log the structure of the first location if available
      if (locationData.length > 0) {
        console.log('📍 Sample location structure:', {
          firstLocation: locationData[0],
          idField: locationData[0].id || locationData[0].location_id,
          availableFields: Object.keys(locationData[0])
        });
      }
  
      setLocations(locationData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching locations:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
  
      let errorMessage = 'Failed to fetch locations';
      if (err.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
      } else if (err.response?.status === 403) {
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
      // Geocoding code remains the same
      const geocodingResponse = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: newLocation.trim(),
          format: 'json',
          limit: 1
        }
      });
  
      const locationData = geocodingResponse.data[0];
  
      if (!locationData) {
        setError('Could not find location details');
        return;
      }
  
      // Update the field names to match what the backend expects
      const newLocationData = {
        city_name: locationData.display_name.split(',')[0].trim(),  // Changed from cityName
        country_code: getCountryCode(locationData.display_name),    // Changed from countryCode
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon)
      };
  
      const response = await axios.post(`${LOCATIONS_API_URL}/locations`, newLocationData, {
        headers: getAuthHeaders()
      });
  
      // Adjust based on actual response structure
      const addedLocation = response.data.location_id 
        ? { 
            location_id: response.data.location_id, 
            ...newLocationData 
          } 
        : response.data;
  
      setLocations(prevLocations => [...prevLocations, addedLocation]);
      setNewLocation('');
      setError('');
      fetchLocations();
    } catch (err) {
      console.error('Error adding location:', err);
      setError(err.response?.data?.message || 'Failed to add location');
    }
  };
  
  // Utility function to extract country code
  const getCountryCode = (displayName) => {
    const parts = displayName.split(',');
    const countryPart = parts[parts.length - 1].trim();
    
    // Map common variations of country names
    const countryCodeMap = {
      'United States': 'US',
      'United States of America': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Great Britain': 'GB',
      // Add more as needed
    };
  
    const code = countryCodeMap[countryPart];
    if (!code) {
      console.warn('Unknown country:', countryPart);
    }
    return code || 'US';  // Default to US instead of 'Unknown'
  };

  const removeLocation = async (locationId) => {
    if (!user?.username) return;
    if (!locationId) {
      console.error('No location ID provided:', {
        locationId,
        locationsData: locations
      });
      setError('Unable to remove location: Invalid ID');
      return;
    }
  
    const deleteUrl = `${LOCATIONS_API_URL}/locations/${locationId}`;
    console.log('Attempting to delete location:', {
      url: deleteUrl,
      locationId,
      location: locations.find(loc => loc.location_id === locationId)
    });
  
    try {
      await axios.delete(deleteUrl, {
        headers: getAuthHeaders()
      });
      
      setLocations(prevLocations => 
        prevLocations.filter(loc => loc.location_id !== locationId)  // Update this too
      );
      
      fetchLocations();
    } catch (err) {
      console.error('Error removing location:', err);
      setError(err.response?.data?.message || 'Failed to remove location');
    }
  };

  const testApiConnection = async () => {
    try {
      // First, try an OPTIONS request
      console.log('Testing OPTIONS request...');
      const optionsResponse = await axios({
        method: 'OPTIONS',
        url: `${LOCATIONS_API_URL}/locations`,
        headers: {
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization,content-type',
          'Origin': window.location.origin
        }
      });
      console.log('OPTIONS response:', optionsResponse);
  
      // Then try a GET request with no auth
      console.log('Testing GET request without auth...');
      const getResponse = await axios.get(`${LOCATIONS_API_URL}/locations`);
      console.log('GET response:', getResponse);
    } catch (err) {
      console.log('Test request failed:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        headers: err.response?.headers,
        data: err.response?.data,
        message: err.message
      });
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

      {process.env.NODE_ENV !== 'production' && (
    <Button 
      variant="secondary" 
      size="sm" 
      className="mb-3"
      onClick={testApiConnection}
    >
      Test API Connection
    </Button>
  )}

  
      
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
              onRemove={() => removeLocation(location.location_id)}
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