import React, { useState, useEffect, useRef } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";

const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_BACKOFF_DELAY = 500;
const CONNECTION_TIMEOUT = 5000; // 5 second timeout

const WeatherCard = ({ location, onRemove }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const { user } = useAuth();

  const connectWebSocket = () => {
    // Clear any existing connection and timeouts
    if (wsRef.current) {
      console.log('Closing existing connection');
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (!user?.token) {
      setError("Authentication required");
      setLoading(false);
      return;
    }

    if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setError("Unable to establish connection. Please refresh the page.");
      setLoading(false);
      return;
    }

    const backoffDelay = Math.min(
      INITIAL_BACKOFF_DELAY * Math.pow(2, attemptRef.current),
      10000
    );

    console.log("Initiating WebSocket connection...", {
      attempt: attemptRef.current + 1,
      backoffDelay,
      location: location.name
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      try {
        const websocketUrlWithToken = `${WEBSOCKET_API_URL}?token=${encodeURIComponent(
          user.token
        )}`;
        const ws = new WebSocket(websocketUrlWithToken);

        // Set connection timeout
        connectionTimeoutRef.current = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.log('Connection timeout - closing socket');
            ws.close();
            setError("Connection timeout");
            setLoading(false);
          }
        }, CONNECTION_TIMEOUT);

        ws.onopen = () => {
          console.log('WebSocket connected successfully');
          clearTimeout(connectionTimeoutRef.current);
          setIsConnected(true);
          attemptRef.current = 0;
          
          // Delay subscription to ensure Lambda is ready
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN && location?.name) {
              try {
                const message = {
                  action: 'subscribe',
                  locationName: location.name,
                  token: user.token
                };
                console.log('Sending subscription message for:', location.name);
                ws.send(JSON.stringify(message));
              } catch (err) {
                console.error('Error sending subscription:', err);
                setError("Failed to subscribe to updates");
              }
            }
          }, 1000); // Increased delay to 1 second
        };

        ws.onmessage = (event) => {
          console.log('Received WebSocket message for:', location.name);
          try {
            const data = JSON.parse(event.data);
            console.log("Parsed message data:", data);

            if (data.type === "error") {
              setError(data.message);
              setLoading(false);
              return;
            }

            if (data.type === "weatherUpdate") {
              const locationData = Array.isArray(data.data)
                ? data.data.find((d) => d.locationName === location.name)
                : data.data.locationName === location.name
                ? data.data
                : null;

              if (locationData) {
                console.log('Setting weather data for:', location.name);
                setWeather(locationData);
                setError("");
                setLoading(false);
              }
            }
          } catch (err) {
            console.error("Error processing message:", err);
            setError("Error processing weather data");
            setLoading(false);
          }
        };

        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          setError("Connection error");
          setLoading(false);
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          console.log("WebSocket closed:", {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            location: location.name
          });

          setIsConnected(false);
          wsRef.current = null;

          if (event.code !== 1000) {
            attemptRef.current++;
            connectWebSocket();
          }
        };

        wsRef.current = ws;
      } catch (connectionError) {
        console.error("WebSocket connection failed:", connectionError);
        setError("Failed to establish connection");
        setLoading(false);
      }
    }, backoffDelay);
  };

  useEffect(() => {
    console.log('WeatherCard mounted/updated for:', location.name);
    connectWebSocket();

    return () => {
      console.log('WeatherCard unmounting for:', location.name);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const message = {
            action: "unsubscribe",
            locationName: location.name,
            token: user?.token,
          };
          wsRef.current.send(JSON.stringify(message));
          wsRef.current.close();
        } catch (err) {
          console.error('Error during cleanup:', err);
        }
      }
    };
  }, [location.name, user?.token]);

  const handleRefresh = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        action: "getWeather",
        locationName: location.name,
        token: user?.token,
      };
      wsRef.current.send(JSON.stringify(message));
      setLoading(true);
    } else {
      setError("Connection lost. Attempting to reconnect...");
      attemptRef.current = 0;
      connectWebSocket();
    }
  };

  const getLoadingMessage = () => {
    if (!isConnected) {
      return "Connecting to server...";
    }
    if (attemptRef.current > 0) {
      return `Reconnecting (Attempt ${attemptRef.current}/${MAX_RECONNECT_ATTEMPTS})...`;
    }
    return "Loading weather data...";
  };

  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-start">
          {location.name}
          <Button variant="outline-danger" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </Card.Title>
        {loading ? (
          <div className="text-center">
            <Spinner animation="border" role="status" className="mb-2" />
            <div>{getLoadingMessage()}</div>
          </div>
        ) : error ? (
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
        ) : (
          <>
            <Card.Text as="div">
              {weather ? (
                <>
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
                </>
              ) : (
                <div className="text-muted">No weather data available</div>
              )}
            </Card.Text>
            <div className="text-muted mt-3">
              <small>
                Last updated:{" "}
                {weather?.timestamp
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
        )}
      </Card.Body>
    </Card>
  );
};

export default WeatherCard;