import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API;

const WeatherCard = ({ location, onRemove }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ws, setWs] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        let websocket = null;
        
        const connectWebSocket = () => {
            // Verify we have a token
            if (!user?.token) {
                console.error('No authentication token available');
                setError('Authentication required');
                setLoading(false);
                return;
            }

            console.log('Connecting to WebSocket...', {
                baseUrl: WEBSOCKET_API_URL,
                tokenLength: user.token.length
            });

            // Append token as a query parameter
            const websocketUrlWithToken = `${WEBSOCKET_API_URL}?token=${encodeURIComponent(user.token)}`;

            try {
                websocket = new WebSocket(websocketUrlWithToken);

                websocket.onopen = () => {
                    console.log('WebSocket connected successfully');
                    
                    // Subscribe to weather updates for this location
                    if (location?.name) {
                        const message = {
                            action: 'subscribe',
                            locationName: location.name
                        };
                        websocket.send(JSON.stringify(message));
                    }
                };

                websocket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('Received weather data:', data);

                        if (data.error) {
                            setError(data.error);
                            setLoading(false);
                            return;
                        }

                        if (data.locationName === location.name) {
                            setWeather(data);
                            setError('');
                            setLoading(false);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                        setError('Error processing weather data');
                        setLoading(false);
                    }
                };

                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setError('Connection error');
                    setLoading(false);
                };

                websocket.onclose = (event) => {
                    console.log('WebSocket disconnected:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                    
                    // Attempt to reconnect after a delay
                    setTimeout(connectWebSocket, 3000);
                };

                setWs(websocket);
            } catch (connectionError) {
                console.error('WebSocket connection failed:', connectionError);
                setError('Failed to establish WebSocket connection');
                setLoading(false);
            }
        };

        connectWebSocket();

        // Cleanup on unmount
        return () => {
            if (websocket) {
                // Unsubscribe before closing
                if (websocket.readyState === WebSocket.OPEN) {
                    const message = {
                        action: 'unsubscribe',
                        locationName: location.name
                    };
                    websocket.send(JSON.stringify(message));
                }
                websocket.close();
            }
        };
    }, [location.name, user?.token]);

    // Handle manual refresh
    const handleRefresh = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const message = {
                action: 'getData',
                locationName: location.name
            };
            ws.send(JSON.stringify(message));
            setLoading(true);
        } else {
            setError('Connection lost. Trying to reconnect...');
        }
    };

    // Render methods remain the same as in the original component
    if (loading) {
        return (
            <Card className="h-100">
                <Card.Body className="text-center d-flex align-items-center justify-content-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </Spinner>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="h-100">
                <Card.Body>
                    <Card.Title className="d-flex justify-content-between align-items-start">
                        {location.name}
                        <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={onRemove}
                        >
                            Remove
                        </Button>
                    </Card.Title>
                    <div className="text-danger my-3">{error}</div>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleRefresh}
                        className="mt-2"
                    >
                        Retry
                    </Button>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="h-100">
            <Card.Body>
                <Card.Title className="d-flex justify-content-between align-items-start">
                    {location.name}
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={onRemove}
                    >
                        Remove
                    </Button>
                </Card.Title>
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
                    <small>Last updated: {weather?.timestamp ? new Date(weather.timestamp).toLocaleTimeString() : 'Never'}</small>
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
};

export default WeatherCard;