import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API;
const MAX_RECONNECT_ATTEMPTS = 5;

const WeatherCard = ({ location, onRemove }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const wsRef = useRef(null);
    const attemptRef = useRef(0);
    const reconnectTimeoutRef = useRef(null);
    const { user } = useAuth();

    const connectWebSocket = () => {
        // Clear any existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (!user?.token) {
            setError('Authentication required');
            setLoading(false);
            return;
        }

        if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setError('Unable to establish connection. Please refresh the page.');
            setLoading(false);
            return;
        }

        const backoffDelay = attemptRef.current > 0 
            ? Math.min(1000 * Math.pow(2, attemptRef.current), 10000) 
            : 0;

        console.log('Connecting to WebSocket...', {
            baseUrl: WEBSOCKET_API_URL,
            tokenLength: user.token.length,
            attempt: attemptRef.current + 1,
            backoffDelay
        });

        reconnectTimeoutRef.current = setTimeout(() => {
            try {
                const websocketUrlWithToken = `${WEBSOCKET_API_URL}?token=${encodeURIComponent(user.token)}`;
                const ws = new WebSocket(websocketUrlWithToken);

                ws.onopen = () => {
                    console.log('WebSocket connected successfully');
                    attemptRef.current = 0;
                    
                    if (location?.name) {
                        const message = {
                            action: 'subscribe',
                            locationName: location.name,
                            token: user.token
                        };
                        ws.send(JSON.stringify(message));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('Received WebSocket message:', data);

                        if (data.type === 'error') {
                            setError(data.message);
                            setLoading(false);
                            return;
                        }

                        if (data.type === 'weatherUpdate') {
                            const locationData = Array.isArray(data.data) 
                                ? data.data.find(d => d.locationName === location.name)
                                : data.data.locationName === location.name ? data.data : null;

                            if (locationData) {
                                setWeather(locationData);
                                setError('');
                                setLoading(false);
                            }
                        }

                        if (data.type === 'noLocations') {
                            setError(data.message);
                            setLoading(false);
                        }
                    } catch (err) {
                        console.error('Error parsing WebSocket message:', err);
                        setError('Error processing weather data');
                        setLoading(false);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    setError('Connection error');
                    setLoading(false);
                };

                ws.onclose = (event) => {
                    console.log('WebSocket disconnected:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });

                    wsRef.current = null;

                    if (event.code !== 1000) {
                        attemptRef.current++;
                        connectWebSocket();
                    }
                };

                wsRef.current = ws;
            } catch (connectionError) {
                console.error('WebSocket connection failed:', connectionError);
                setError('Failed to establish WebSocket connection');
                setLoading(false);
            }
        }, backoffDelay);
    };

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const message = {
                    action: 'unsubscribe',
                    locationName: location.name,
                    token: user?.token
                };
                wsRef.current.send(JSON.stringify(message));
                wsRef.current.close();
            }
        };
    }, [location.name, user?.token]);

    const handleRefresh = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = {
                action: 'getWeather',
                locationName: location.name,
                token: user?.token
            };
            wsRef.current.send(JSON.stringify(message));
            setLoading(true);
        } else {
            setError('Connection lost. Attempting to reconnect...');
            attemptRef.current = 0;
            connectWebSocket();
        }
    };

    const getLoadingMessage = () => {
        if (connectionStatus === 'connecting' && connectAttempt > 0) {
            return `Connecting (Attempt ${connectAttempt}/${MAX_RECONNECT_ATTEMPTS})...`;
        }
        return 'Loading...';
    };

    if (loading) {
        return (
            <Card className="h-100">
                <Card.Body className="text-center d-flex flex-column align-items-center justify-content-center">
                    <Spinner animation="border" role="status" className="mb-2" />
                    <span>{getLoadingMessage()}</span>
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