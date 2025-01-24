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
    }, [componentId, logger]);

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
    }, [componentId, logger]);

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
      logger,
      componentId,
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
      <>
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
      </>
    );

    const renderDetailedInfo = () => (
      <div className="grid grid-cols-2 gap-2">
        {/* Temperature Section */}
        <div>
          <strong>Temperature:</strong> {weatherState.data?.temperature}°F
        </div>
        <div>
          <strong>Feels Like:</strong> {weatherState.data?.feelsLike}°F
        </div>
        
        {/* Wind Section */}
        <div>
          <strong>Wind Speed:</strong> {weatherState.data?.windSpeed} MPH
        </div>
        <div>
          <strong>Wind Direction:</strong> {weatherState.data?.windDirection}
        </div>
        <div>
          <strong>Wind Gusts:</strong> {weatherState.data?.windGusts} MPH
        </div>
        
        {/* Atmospheric Conditions */}
        <div>
          <strong>Pressure:</strong> {weatherState.data?.pressure} inHg
        </div>
        <div>
          <strong>Humidity:</strong> {weatherState.data?.humidity}%
        </div>
        <div>
          <strong>Cloud Cover:</strong> {weatherState.data?.cloudCover}%
        </div>
        <div>
          <strong>Visibility:</strong> {weatherState.data?.visibility} mi
        </div>
        <div>
          <strong>UV Index:</strong> {weatherState.data?.uvIndex}
        </div>
        <div>
          <strong>Precipitation:</strong> {weatherState.data?.precipitation} in
        </div>
        
        {/* Air Quality Section */}
        {weatherState.data?.airQuality && (
          <>
            <div className="col-span-2 font-medium text-gray-700 mt-3 mb-2">Air Quality</div>
            <div>
              <strong>CO:</strong> {weatherState.data.airQuality.co} μg/m³
            </div>
            <div>
              <strong>NO2:</strong> {weatherState.data.airQuality.no2} μg/m³
            </div>
            <div>
              <strong>O3:</strong> {weatherState.data.airQuality.o3} μg/m³
            </div>
            <div>
              <strong>SO2:</strong> {weatherState.data.airQuality.so2} μg/m³
            </div>
            <div>
              <strong>PM2.5:</strong> {weatherState.data.airQuality.pm2_5} μg/m³
            </div>
            <div>
              <strong>PM10:</strong> {weatherState.data.airQuality.pm10} μg/m³
            </div>
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