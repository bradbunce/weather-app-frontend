import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useLogger } from "../utils/logger";

export const WeatherCard = React.memo(
  ({ location, onRemove }) => {
    const componentId = useMemo(
      () => `weather-${location.location_id}`,
      [location.location_id]
    );
    const { isAuthenticated } = useAuth();
    const webSocket = useWebSocket();
    const logger = useLogger();

    const [weatherState, setWeatherState] = useState({
      data: null,
      loading: true,
      error: "",
      isConnected: false,
    });

    // Handle incoming weather data
    const handleMessage = useCallback(
      (message) => {
        logger.debug("Weather card received message", {
          cardId: componentId,
          type: message.type,
          data: message.data,
        });

        if (message.data) {
          setWeatherState((prev) => ({
            ...prev,
            data: message.data,
            loading: false,
            error: "",
            isConnected: true,
          }));
        } else {
          setWeatherState((prev) => ({
            ...prev,
            loading: false,
            error: "No data available for this location",
            isConnected: true,
          }));
        }
      },
      [componentId, logger]
    );

    // Handle connection errors
    const handleError = useCallback(
      (errorMessage) => {
        logger.error("WeatherCard error", {
          cardId: componentId,
          message: errorMessage,
        });

        setWeatherState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          isConnected: false,
        }));
      },
      [componentId, logger]
    );

    // Register with WebSocket service
    useEffect(() => {
      if (!isAuthenticated || !location?.location_id) {
        setWeatherState((prev) => ({
          ...prev,
          loading: false,
          error: "Authentication required",
          isConnected: false,
        }));
        return;
      }

      logger.debug("Registering weather card handler", {
        cardId: componentId,
        locationId: location.location_id,
      });

      // Add handler for this location
      webSocket.addLocationHandler(location.location_id, {
        onMessage: handleMessage,
        onError: handleError,
      });

      // Cleanup on unmount
      return () => {
        logger.debug("Cleaning up weather card handler", {
          cardId: componentId,
          locationId: location.location_id,
        });
        webSocket.removeLocationHandler(location.location_id);
      };
    }, [
      location?.location_id,
      webSocket,
      handleMessage,
      handleError,
      isAuthenticated,
      logger,
      componentId,
    ]);

    // Handle refresh button click
    const handleRefresh = useCallback(() => {
      if (!isAuthenticated) {
        handleError("Not authenticated");
        return;
      }

      setWeatherState((prev) => ({ ...prev, loading: true }));
      const success = webSocket.refreshWeather([location.location_id]);

      if (!success) {
        handleError("Unable to refresh weather data");
      }
    }, [location.location_id, webSocket, handleError, isAuthenticated]);

    // Render loading state
    if (weatherState.loading) {
      return (
        <Card className="h-100">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-start">
              {location.city_name}
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onRemove(location.location_id)}
              >
                Remove
              </Button>
            </Card.Title>
            <div className="text-center">
              <Spinner animation="border" role="status" className="mb-2" />
              <div>Loading weather data...</div>
            </div>
          </Card.Body>
        </Card>
      );
    }

    // Render error state
    if (weatherState.error) {
      return (
        <Card className="h-100">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-start">
              {location.city_name}
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => onRemove(location.location_id)}
              >
                Remove
              </Button>
            </Card.Title>
            <div className="text-danger my-3">{weatherState.error}</div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </Card.Body>
        </Card>
      );
    }

    // Render weather data
    return (
      <Card className="h-100">
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-start">
            {location.city_name}
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onRemove(location.location_id)}
            >
              Remove
            </Button>
          </Card.Title>
          <Card.Text as="div">
            <div className="mb-2">
              <strong>Temperature:</strong> {weatherState.data?.temperature}°F
            </div>
            <div className="mb-2">
              <strong>Condition:</strong> {weatherState.data?.condition}
            </div>
            <div className="mb-2">
              <strong>Humidity:</strong> {weatherState.data?.humidity}%
            </div>
            <div>
              <strong>Wind Speed:</strong> {weatherState.data?.windSpeed} MPH
            </div>
          </Card.Text>
          <div className="text-muted mt-3">
            <small>
              Last updated:{" "}
              {weatherState.data?.timestamp
                ? new Date(weatherState.data.timestamp).toLocaleTimeString()
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
        </Card.Body>
      </Card>
    );
  },
  (prevProps, nextProps) =>
    prevProps.location.location_id === nextProps.location.location_id &&
    prevProps.onRemove === nextProps.onRemove
);