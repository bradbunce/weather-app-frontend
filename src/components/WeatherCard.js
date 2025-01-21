import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, Button, Spinner } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useLogger } from "../utils/logger";

export const WeatherCard = React.memo(({ location, onRemove }) => {
    const { user, isAuthenticated } = useAuth();
    const webSocket = useWebSocket();
    const logger = useLogger();

    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isConnected, setIsConnected] = useState(false);

    // Connection parameters
    const connectionParams = useMemo(() => ({
        token: user?.token,
        cityName: location?.city_name,
        countryCode: location?.country_code,
    }), [user?.token, location?.city_name, location?.country_code]);

    const handleMessage = useCallback((data) => {
        if (data.type === "weatherUpdate" || data.type === "getWeather") {
            const locationData = Array.isArray(data.data)
                ? data.data.find(d => d.name === connectionParams.cityName || 
                                    d.locationName === connectionParams.cityName)
                : data.data;

            if (locationData) {
                const weatherData = locationData.weather || locationData;
                logger.debug("Weather data updated", {
                    location: connectionParams.cityName,
                    temperature: weatherData.temperature,
                    condition: weatherData.condition,
                });
                setWeather(weatherData);
                setError("");
                setLoading(false);
                setIsConnected(true);
            } else {
                setError("No data available for this location");
                setLoading(false);
            }
        }
    }, [connectionParams.cityName, logger]);

    const handleError = useCallback((errorMessage) => {
        logger.error("WeatherCard error", {
            message: errorMessage,
            location: connectionParams.cityName,
        });
        setError(errorMessage);
        setLoading(false);
        setIsConnected(false);
    }, [connectionParams.cityName, logger]);

    // Initialize WebSocket connection
    useEffect(() => {
        // Only attempt connection if we're authenticated and have necessary params
        if (!isAuthenticated || !user?.token) {
            logger.debug('Skipping WebSocket connection - not authenticated', {
                cityName: connectionParams.cityName,
                isAuthenticated,
                hasToken: !!user?.token
            });
            return;
        }

        if (!connectionParams.cityName) {
            logger.debug('Skipping WebSocket connection - no city name', {
                params: connectionParams
            });
            return;
        }

        if (!isConnected) {
            logger.debug('Initiating WebSocket connection', {
                cityName: connectionParams.cityName,
                countryCode: connectionParams.countryCode,
                isAuthenticated,
                hasToken: !!user?.token
            });

            webSocket.connect({
                ...connectionParams,
                onMessage: handleMessage,
                onError: handleError
            });
            setIsConnected(true);
        }

        // Cleanup function
        return () => {
            if (connectionParams.cityName && isConnected) {
                logger.debug('Cleaning up WebSocket connection', {
                    cityName: connectionParams.cityName,
                    isAuthenticated,
                    hasToken: !!user?.token
                });
                webSocket.unsubscribe(connectionParams.cityName, connectionParams);
                setIsConnected(false);
            }
        };
    }, [
        connectionParams, 
        webSocket, 
        handleMessage, 
        handleError, 
        logger, 
        isConnected, 
        isAuthenticated, 
        user?.token
    ]);

    // Handle auth state changes
    useEffect(() => {
        if (!isAuthenticated) {
            setIsConnected(false);
            setWeather(null);
            setLoading(true);
        }
    }, [isAuthenticated]);

    // Rest of the component stays the same...
    const handleRefresh = useCallback(() => {
        if (!isAuthenticated) {
            handleError("Not authenticated");
            return;
        }
        
        setLoading(true);
        const success = webSocket.refreshWeather(connectionParams.cityName, connectionParams);
        if (!success) {
            handleError("Connection lost. Attempting to reconnect...");
            webSocket.connect({
                ...connectionParams,
                onMessage: handleMessage,
                onError: handleError
            });
        }
    }, [connectionParams, webSocket, handleMessage, handleError, isAuthenticated]);

    const loadingMessage = isConnected ? "Loading weather data..." : "Connecting to server...";

    // Render weather details
    const renderWeatherDetails = useMemo(() => {
        if (loading) {
            return (
                <div className="text-center">
                    <Spinner animation="border" role="status" className="mb-2" />
                    <div>{loadingMessage}</div>
                </div>
            );
        }

        if (error) {
            return (
                <>
                    <div className="text-danger my-3">{error}</div>
                    <Button variant="outline-danger" size="sm" onClick={() => onRemove(location.location_id)}>
                        Remove
                    </Button>
                </>
            );
        }

        return weather ? (
            <>
                <Card.Text as="div">
                    <div className="mb-2">
                        <strong>Temperature:</strong> {weather.temperature}°F
                    </div>
                    <div className="mb-2">
                        <strong>Condition:</strong> {weather.condition}
                    </div>
                    <div className="mb-2">
                        <strong>Humidity:</strong> {weather.humidity}%
                    </div>
                    <div>
                        <strong>Wind Speed:</strong> {weather.windSpeed} MPH
                    </div>
                </Card.Text>
                <div className="text-muted mt-3">
                    <small>
                        Last updated: {weather.timestamp ? new Date(weather.timestamp).toLocaleTimeString() : "Never"}
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
    }, [weather, loading, error, loadingMessage, handleRefresh, location.location_id, onRemove]);

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
                {renderWeatherDetails}
            </Card.Body>
        </Card>
    );
});