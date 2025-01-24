import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useLogger } from "../utils/logger";

export const WeatherCard = React.memo(
  ({ location, onRemove, showDetailed }) => {
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

    const handleMessage = useCallback((message) => {
      logger.debug("Weather card received message", {
        cardId: componentId,
        type: message.type,
        data: message.data,
      });

      if (Array.isArray(message.data)) {
        const locationData = message.data.find(item => item.id === location.location_id);
        if (locationData?.weather) {
          setWeatherState(prev => ({
            ...prev,
            data: locationData.weather,
            loading: false,
            error: "",
            isConnected: true
          }));
        }
      }
    }, [logger, location.location_id, componentId]);

    const handleError = useCallback((errorMessage) => {
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
    }, [logger, componentId]);

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

      webSocket.addLocationHandler(location.location_id, {
        onMessage: handleMessage,
        onError: handleError,
      });

      return () => {
        webSocket.removeLocationHandler(location.location_id);
      };
    }, [
      location?.location_id,
      webSocket,
      handleMessage,
      handleError,
      isAuthenticated,
    ]);

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

    if (weatherState.loading) {
      return (
        <Card className="h-100">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-start">
              {location.city_name}
              <Button variant="outline-danger" size="sm" onClick={() => onRemove(location.location_id)}>
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

    if (weatherState.error) {
      return (
        <Card className="h-100">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-start">
              {location.city_name}
              <Button variant="outline-danger" size="sm" onClick={() => onRemove(location.location_id)}>
                Remove
              </Button>
            </Card.Title>
            <div className="text-danger my-3">{weatherState.error}</div>
            <Button variant="outline-secondary" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </Card.Body>
        </Card>
      );
    }

    const renderBasicInfo = () => (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <strong>Temperature:</strong> {weatherState.data?.temp_f}°F
        </div>
        <div>
          <strong>Condition:</strong> {weatherState.data?.condition_text}
        </div>
        <div>
          <strong>Humidity:</strong> {weatherState.data?.humidity}%
        </div>
        <div>
          <strong>Wind:</strong> {weatherState.data?.wind_mph} MPH {weatherState.data?.wind_dir}
        </div>
      </div>
    );

    const renderDetailedInfo = () => (
      <div className="grid grid-cols-2 gap-2">
        {/* Temperature Section */}
        <div className="col-span-2 font-medium text-gray-700 mt-2 mb-1">Temperature</div>
        <div>
          <strong>Current:</strong> {weatherState.data?.temp_f}°F
        </div>
        <div>
          <strong>Feels Like:</strong> {weatherState.data?.feelslike_f}°F
        </div>

        {/* Wind Section */}
        <div className="col-span-2 font-medium text-gray-700 mt-3 mb-1">Wind</div>
        <div>
          <strong>Speed:</strong> {weatherState.data?.wind_mph} MPH
        </div>
        <div>
          <strong>Direction:</strong> {weatherState.data?.wind_dir} ({weatherState.data?.wind_degree}°)
        </div>
        <div>
          <strong>Gusts:</strong> {weatherState.data?.gust_mph} MPH
        </div>

        {/* Conditions Section */}
        <div className="col-span-2 font-medium text-gray-700 mt-3 mb-1">Conditions</div>
        <div>
          <strong>Humidity:</strong> {weatherState.data?.humidity}%
        </div>
        <div>
          <strong>Cloud Cover:</strong> {weatherState.data?.cloud}%
        </div>
        <div>
          <strong>Pressure:</strong> {weatherState.data?.pressure_in} inHg
        </div>
        <div>
          <strong>Visibility:</strong> {weatherState.data?.vis_miles} mi
        </div>
        <div>
          <strong>UV Index:</strong> {weatherState.data?.uv}
        </div>
        <div>
          <strong>Precipitation:</strong> {weatherState.data?.precip_in} in
        </div>

        {/* Location Details */}
        {location.metadata && (
          <>
            <div className="col-span-2 font-medium text-gray-700 mt-3 mb-1">Location</div>
            <div>
              <strong>Region:</strong> {location.metadata.region}
            </div>
            <div>
              <strong>Country:</strong> {location.metadata.country}
            </div>
            <div>
              <strong>Timezone:</strong> {location.metadata.timezone}
            </div>
            {location.coordinates && (
              <div>
                <strong>Coordinates:</strong> {location.coordinates.latitude}, {location.coordinates.longitude}
              </div>
            )}
          </>
        )}
      </div>
    );

    return (
      <Card className="h-100">
        <Card.Body>
          <Card.Title className="d-flex justify-content-between align-items-start">
            {location.city_name}
            <Button variant="outline-danger" size="sm" onClick={() => onRemove(location.location_id)}>
              Remove
            </Button>
          </Card.Title>
          
          <Card.Text as="div">
            {showDetailed ? renderDetailedInfo() : renderBasicInfo()}
          </Card.Text>
          
          <div className="text-muted mt-3">
            <small>
              Last updated:{" "}
              {weatherState.data?.last_updated
                ? new Date(weatherState.data.last_updated).toLocaleTimeString()
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
    prevProps.onRemove === nextProps.onRemove &&
    prevProps.showDetailed === nextProps.showDetailed
);