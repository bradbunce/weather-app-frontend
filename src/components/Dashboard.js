import React, { useState, useEffect, useCallback } from "react";
import { Container, Row, Col, Button, Form, Alert } from "react-bootstrap";
import axios from "axios";
import { WeatherCard } from "./WeatherCard";
import { useAuth } from "../contexts/AuthContext";
import { LoadingSpinner } from './LoadingSpinner';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;

export const Dashboard = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState("");
  const [error, setError] = useState("");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const { user } = useAuth();

  // Step 1: Add axios interceptors for request/response debugging
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((request) => {
      const currentToken = user?.token;
      const requestToken = request.headers?.Authorization?.replace(
        "Bearer ",
        ""
      );

      console.log("🚀 Starting Request:", {
        url: request.url,
        method: request.method,
        headers: request.headers,
        tokenMatch: currentToken === requestToken,
      });
      return request;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        console.log("✅ Response:", response);
        return response;
      },
      (error) => {
        console.log("❌ Response Error:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          corsHeaders: {
            "Access-Control-Allow-Origin":
              error.response?.headers?.["access-control-allow-origin"],
            "Access-Control-Allow-Headers":
              error.response?.headers?.["access-control-allow-headers"],
            "Access-Control-Allow-Methods":
              error.response?.headers?.["access-control-allow-methods"],
          },
        });
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [user?.token]);

  const getAuthHeaders = useCallback(() => {
    if (!user?.token) {
      console.warn("⚠️ No auth token available");
      return {};
    }
    const freshToken = localStorage.getItem("authToken");
    if (freshToken !== user.token) {
      console.warn("⚠️ Token mismatch between user object and localStorage");
    }
    return {
      Authorization: `Bearer ${freshToken || user.token}`,
      "Content-Type": "application/json",
    };
  }, [user?.token]);

  const fetchLocations = useCallback(async () => {
    if (!user?.username) {
      console.log("👤 No user data, skipping locations fetch");
      return;
    }

    try {
      setIsLoadingLocations(true);  // Set loading state when starting fetch
      
      console.log("🌐 API Configuration:", {
        baseURL: LOCATIONS_API_URL,
        fullURL: `${LOCATIONS_API_URL}/locations`,
        headers: getAuthHeaders(),
      });

      const response = await axios.get(`${LOCATIONS_API_URL}/locations`, {
        headers: getAuthHeaders(),
      });

      let locationData;
      if (response.data?.locations) {
        locationData = response.data.locations;
      } else if (Array.isArray(response.data)) {
        locationData = response.data;
      } else {
        console.warn("⚠️ Unexpected locations data format:", response.data);
        locationData = [];
      }

      setLocations(locationData);
    } catch (err) {
      console.error("❌ Error fetching locations:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });

      let errorMessage = "Failed to fetch locations";
      if (err.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (err.response?.status === 403) {
        errorMessage = "Authentication error. Please check your login status.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoadingLocations(false);  // Clear loading state when done
    }
  }, [user?.username, getAuthHeaders]);

  useEffect(() => {
    let mounted = true;

    if (user?.token) {
      try {
        const [, payload] = user.token.split(".");
        const tokenPayload = JSON.parse(atob(payload));
        const tokenExpiryDate = new Date(tokenPayload.exp * 1000);

        console.log("🎟️ Token debug:", {
          tokenLength: user.token.length,
          tokenStart: user.token.substring(0, 20) + "...",
          tokenPayload,
          tokenExpiry: tokenExpiryDate,
          isExpired: tokenExpiryDate < new Date(),
        });
      } catch (err) {
        console.error("Token parsing error:", err);
      }

      if (mounted) {
        fetchLocations();
      }
    }

    return () => {
      mounted = false;
    };
  }, [user, fetchLocations]);

  const removeLocation = useCallback(
    async (locationId) => {
      if (!user?.username || !locationId) {
        console.error("Invalid removal request:", {
          locationId,
          hasUser: !!user?.username,
        });
        return;
      }

      try {
        const deleteUrl = `${LOCATIONS_API_URL}/locations/${locationId}`;
        await axios.delete(deleteUrl, {
          headers: getAuthHeaders(),
        });

        setLocations((prevLocations) =>
          prevLocations.filter((loc) => loc.location_id !== locationId)
        );
      } catch (err) {
        console.error("Error removing location:", {
          error: err,
          locationId,
        });
        setError(err.response?.data?.message || "Failed to remove location");
      }
    },
    [user?.username, getAuthHeaders]
  );

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

  const addLocation = async (e) => {
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
        setError("Could not find location details");
        return;
      }

      const newLocationData = {
        city_name: locationData.display_name.split(",")[0].trim(),
        country_code: getCountryCode(locationData.display_name),
        latitude: parseFloat(locationData.lat),
        longitude: parseFloat(locationData.lon),
      };

      const response = await axios.post(
        `${LOCATIONS_API_URL}/locations`,
        newLocationData,
        {
          headers: getAuthHeaders(),
        }
      );

      const addedLocation = response.data.location_id
        ? {
            location_id: response.data.location_id,
            ...newLocationData,
          }
        : response.data;

      setLocations((prevLocations) => [...prevLocations, addedLocation]);
      setNewLocation("");
      setError("");
    } catch (err) {
      console.error("Error adding location:", err);
      setError(err.response?.data?.message || "Failed to add location");
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
                apiUrl: LOCATIONS_API_URL,
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

  // Replace the return section of your Dashboard component with this:
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
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {isLoadingLocations ? (
        <div className="d-flex justify-content-center py-5">
          <LoadingSpinner />
        </div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {locations.map((location) => (
            <Col key={location.location_id}>
              <WeatherCard location={location} onRemove={removeLocation} />
            </Col>
          ))}
        </Row>
      )}
      
      {!isLoadingLocations && locations.length === 0 && !error && (
        <Alert variant="info">
          No locations added yet. Add a city to get started!
        </Alert>
      )}
    </Container>
  );
};