import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_BACKOFF_DELAY = 500;
const CONNECTION_TIMEOUT = 5000;

const WeatherCard = React.memo(({ location, onRemove }) => {
  const { user } = useAuth();
  
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  // Memoized connection parameters to prevent unnecessary reconnects
  const connectionParams = useMemo(() => ({
    token: user?.token,
    cityName: location?.city_name,
    countryCode: location?.country_code
  }), [user?.token, location?.city_name, location?.country_code]);

  // Centralized error handling
  const handleError = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false);
    setIsConnected(false);
  }, []);

  // Clean up WebSocket connections
  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // WebSocket connection logic
  const connectWebSocket = useCallback(() => {
    // Validation checks
    if (!connectionParams.token) {
      return handleError("Authentication required");
    }

    if (!connectionParams.cityName) {
      return handleError("Location information missing");
    }

    if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      return handleError("Unable to establish connection. Please refresh the page.");
    }

    cleanupWebSocket();

    const backoffDelay = Math.min(
      INITIAL_BACKOFF_DELAY * Math.pow(2, attemptRef.current),
      10000
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      try {
        const websocketUrl = `${WEBSOCKET_API_URL}?token=${encodeURIComponent(connectionParams.token)}`;
        const ws = new WebSocket(websocketUrl);

        // Connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            handleError("Connection timeout");
          }
        }, CONNECTION_TIMEOUT);

        // WebSocket event handlers
        ws.onopen = () => {
          clearTimeout(connectionTimeoutRef.current);
          setIsConnected(true);
          attemptRef.current = 0;

          // Send subscription after a short delay
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({
                  action: 'subscribe',
                  locationName: connectionParams.cityName,
                  countryCode: connectionParams.countryCode,
                  token: connectionParams.token
                }));
              } catch (err) {
                handleError("Failed to subscribe to updates");
              }
            }
          }, 1000);
        };

        // Process incoming messages
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "error") {
              return handleError(data.message);
            }

            if (data.type === "weatherUpdate") {
              const locationData = Array.isArray(data.data)
                ? data.data.find(d => 
                    d.name === connectionParams.cityName || 
                    d.locationName === connectionParams.cityName
                  )
                : data.data;

              if (locationData) {
                setWeather(locationData.weather || locationData);
                setError("");
                setLoading(false);
              } else {
                handleError("No data available for this location");
              }
            }
          } catch (err) {
            handleError("Error processing weather data");
          }
        };

        // Error and close handlers
        ws.onerror = () => handleError("Connection error");
        
        ws.onclose = (event) => {
          setIsConnected(false);
          wsRef.current = null;

          if (event.code !== 1000) {
            attemptRef.current++;
            connectWebSocket();
          }
        };

        wsRef.current = ws;
      } catch {
        handleError("Failed to establish connection");
      }
    }, backoffDelay);
  }, [connectionParams, handleError, cleanupWebSocket]);

  // Main connection effect
  useEffect(() => {
    if (connectionParams.cityName) {
      connectWebSocket();
    }

    return () => {
      cleanupWebSocket();
      
      // Attempt to unsubscribe if possible
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            action: "unsubscribe",
            locationName: connectionParams.cityName,
            countryCode: connectionParams.countryCode,
            token: connectionParams.token,
          }));
          wsRef.current.close();
        } catch {}
      }
    };
  }, [connectionParams, connectWebSocket, cleanupWebSocket]);

  useEffect(() => {
    const handleLogout = () => {
      // Close WebSocket connection
      if (wsRef.current) {
        try {
          wsRef.current.close();
          wsRef.current = null;
        } catch (error) {
          console.error('Error closing WebSocket on logout:', error);
        }
      }

      // Reset all states
      setWeather(null);
      setLoading(false);
      setError("");
      setIsConnected(false);

      // Clear all timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };

    // If user is null, it means logout has occurred
    if (!user) {
      handleLogout();
    }
  }, [user]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "getWeather",
        locationName: connectionParams.cityName,
        countryCode: connectionParams.countryCode,
        token: connectionParams.token,
      }));
      setLoading(true);
    } else {
      handleError("Connection lost. Attempting to reconnect...");
      attemptRef.current = 0;
      connectWebSocket();
    }
  }, [connectionParams, handleError, connectWebSocket]);

  // Loading message generator
  const getLoadingMessage = useMemo(() => {
    if (!isConnected) return "Connecting to server...";
    if (attemptRef.current > 0) return `Reconnecting (Attempt ${attemptRef.current}/${MAX_RECONNECT_ATTEMPTS})...`;
    return "Loading weather data...";
  }, [isConnected]);

  // Render weather details
  const renderWeatherDetails = useMemo(() => {
    if (loading) return (
      <div className="text-center">
        <Spinner animation="border" role="status" className="mb-2" />
        <div>{getLoadingMessage}</div>
      </div>
    );

    if (error) return (
      <>
        <div className="text-danger my-3">{error}</div>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleRefresh}
          className="mt-2"
        >
          Retry
        </Button>
      </>
    );

    return weather ? (
      <>
        <Card.Text as="div">
          <div className="mb-2">
            <strong>Temperature:</strong> {weather.temperature}°C
          </div>
          <div className="mb-2">
            <strong>Condition:</strong> {weather.condition}
          </div>
          <div className="mb-2">
            <strong>Humidity:</strong> {weather.humidity}%
          </div>
          <div>
            <strong>Wind Speed:</strong> {weather.windSpeed} km/h
          </div>
        </Card.Text>
        <div className="text-muted mt-3">
          <small>
            Last updated:{" "}
            {weather.timestamp
              ? new Date(weather.timestamp).toLocaleTimeString()
              : "Never"}
          </small>
        </div>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={handleRefresh}
          className="mt-2"
        >
          Refresh
        </Button>
      </>
    ) : (
      <div className="text-muted">No weather data available</div>
    );
  }, [weather, loading, error, getLoadingMessage, handleRefresh]);

  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-start">
          {location.city_name}
          <Button variant="outline-danger" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </Card.Title>
        {renderWeatherDetails}
      </Card.Body>
    </Card>
  );
});

export default WeatherCard;