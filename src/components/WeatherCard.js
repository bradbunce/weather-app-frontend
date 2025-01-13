import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

const WEBSOCKET_API_URL = process.env.REACT_APP_WEBSOCKET_API;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_CONNECT_TIMEOUT = 45000; // 45 seconds to match Lambda timeout

const WeatherCard = ({ location, onRemove }) => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [ws, setWs] = useState(null);
    const [connectAttempt, setConnectAttempt] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const { user } = useAuth();

    const connectWebSocket = useCallback(() => {
        if (!user?.token) {
            setError('Authentication required');
            setLoading(false);
            return;
        }

        // Don't attempt if we've exceeded max attempts
        if (connectAttempt >= MAX_RECONNECT_ATTEMPTS) {
            setError('Unable to establish connection. Please refresh the page.');
            setLoading(false);
            return;
        }

        // Calculate backoff delay
        const backoffDelay = connectAttempt > 0 ? Math.min(1000 * Math.pow(2, connectAttempt), 10000) : 0;

        console.log('Connecting to WebSocket...', {
            baseUrl: WEBSOCKET_API_URL,
            tokenLength: user.token.length,
            attempt: connectAttempt + 1,
            backoffDelay
        });

        // Set initial connection timeout
        const connectionTimeout = setTimeout(() => {
            if (ws?.readyState !== WebSocket.OPEN) {
                console.log('Connection attempt timed out');
                ws?.close();
            }
        }, INITIAL_CONNECT_TIMEOUT);

        // Wait for backoff delay before attempting connection
        setTimeout(() => {
            try {
                const websocketUrlWithToken = `${WEBSOCKET_API_URL}?token=${encodeURIComponent(user.token)}`;
                const websocket = new WebSocket(websocketUrlWithToken);

                websocket.onopen = () => {
                    console.log('WebSocket connected successfully');
                    clearTimeout(connectionTimeout);
                    setConnectionStatus('connected');
                    setConnectAttempt(0); // Reset attempt counter on success
                    
                    // Subscribe to weather updates
                    if (location?.name) {
                        const message = {
                            action: 'subscribe',
                            locationName: location.name,
                            token: user.token
                        };
                        websocket.send(JSON.stringify(message));
                    }
                };

                websocket.onmessage = (event) => {
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

                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    clearTimeout(connectionTimeout);
                    setConnectionStatus('error');
                };

                websocket.onclose = (event) => {
                    console.log('WebSocket disconnected:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean,
                        attempt: connectAttempt
                    });

                    clearTimeout(connectionTimeout);
                    setConnectionStatus('disconnected');
                    setWs(null);

                    // Only reconnect on abnormal closures
                    if (event.code !== 1000 && connectAttempt < MAX_RECONNECT_ATTEMPTS) {
                        setConnectAttempt(prev => prev + 1);
                        connectWebSocket();
                    }
                };

                setWs(websocket);
            } catch (connectionError) {
                console.error('WebSocket connection failed:', connectionError);
                clearTimeout(connectionTimeout);
                setError('Failed to establish WebSocket connection');
                setLoading(false);
            }
        }, backoffDelay);

        return () => clearTimeout(connectionTimeout);
    }, [user?.token, location?.name, connectAttempt, ws]);

    useEffect(() => {
        const cleanup = connectWebSocket();
        
        return () => {
            cleanup();
            if (ws) {
                if (ws.readyState === WebSocket.OPEN) {
                    const message = {
                        action: 'unsubscribe',
                        locationName: location.name,
                        token: user?.token
                    };
                    ws.send(JSON.stringify(message));
                }
                ws.close();
            }
        };
    }, [location.name, user?.token, connectWebSocket]);

    const handleRefresh = () => {
        if (ws?.readyState === WebSocket.OPEN) {
            const message = {
                action: 'getWeather',
                locationName: location.name,
                token: user?.token
            };
            ws.send(JSON.stringify(message));
            setLoading(true);
        } else {
            setError('Connection lost. Attempting to reconnect...');
            setConnectAttempt(0); // Reset attempt counter
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