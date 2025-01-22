import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLogger } from '../utils/logger';

const WebSocketContext = createContext(null);

class WebSocketService {
    constructor(logger) {
        this.ws = null;
        this.messageHandlers = new Map();
        this.logger = logger;
    }

    connect(params) {
        const { token, cityName, countryCode, onMessage, onError, locationId } = params;
        
        this.logger.debug('Connection request', { 
            hasToken: !!token,
            cityName,
            locationId,
            countryCode
        });

        // Store the message handlers for this locationId
        this.messageHandlers.set(locationId, { 
            onMessage, 
            onError,
            cityName // Store cityName for reference
        });

        // Create WebSocket if it doesn't exist
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            try {
                const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
                this.ws = new WebSocket(websocketUrl);

                this.ws.onopen = () => {
                    this.logger.info('WebSocket connected');
                    // Subscribe all locations
                    for (const [locId, handlers] of this.messageHandlers.entries()) {
                        this.subscribe(this.ws, { 
                            locationId: locId,
                            cityName: handlers.cityName, 
                            countryCode, 
                            token 
                        });
                    }
                };

                this.ws.onmessage = (event) => {
                    try {
                        const parsedEvent = JSON.parse(event.data);
                        
                        this.logger.debug('Raw WebSocket message received', {
                            rawMessage: event.data,
                            parsedType: parsedEvent.type
                        });
                
                        // The data is in parsedEvent.data, not rawData
                        const weatherItems = parsedEvent.data || [];
                        
                        this.logger.debug('Processing WebSocket message', {
                            messageType: parsedEvent.type,
                            weatherItemCount: weatherItems.length,
                            firstItem: weatherItems[0]  // Log the structure of first item
                        });
                
                        // Log all registered handlers
                        this.logger.debug('Current message handlers', {
                            handlerKeys: Array.from(this.messageHandlers.keys())
                        });
                
                        // Process each weather item
                        for (const item of weatherItems) {
                            this.logger.debug('Processing weather item', {
                                item: item,  // Log the full item
                                hasWeather: !!item.weather,
                                locationId: item.location_id
                            });
                
                            // The weather data is nested under weather property
                            const weatherData = item.weather;
                            if (!weatherData) {
                                this.logger.debug('No weather data for item');
                                continue;
                            }
                
                            const locationId = item.location_id;
                            const handler = this.messageHandlers.get(locationId);
                            
                            if (handler) {
                                this.logger.debug('Found handler for location', {
                                    locationId,
                                    cityName: handler.cityName,
                                    weatherData
                                });
                
                                handler.onMessage({
                                    type: parsedEvent.type,
                                    connectionCity: handler.cityName,
                                    data: {
                                        temperature: weatherData.temperature,
                                        condition: weatherData.condition,
                                        humidity: weatherData.humidity,
                                        windSpeed: weatherData.wind_speed,
                                        timestamp: parsedEvent.timestamp,
                                        icon: weatherData.condition_icon
                                    }
                                });
                            } else {
                                this.logger.debug('No handler found for location', {
                                    locationId,
                                    availableHandlers: Array.from(this.messageHandlers.keys())
                                });
                            }
                        }
                    } catch (err) {
                        this.logger.error('Error processing message', {
                            error: err.message,
                            stack: err.stack,
                            data: event.data
                        });
                    }
                };

                this.ws.onerror = (error) => {
                    this.logger.error('WebSocket error', { error: error.message });
                    // Notify all handlers of the error
                    for (const cityHandler of this.messageHandlers.values()) {
                        cityHandler.onError?.('Connection error');
                    }
                };

                this.ws.onclose = () => {
                    this.logger.debug('WebSocket closed');
                    this.ws = null;
                };
            } catch (error) {
                this.logger.error('Failed to establish connection', {
                    error: error.message
                });
                onError?.('Failed to establish connection');
                return null;
            }
        } else {
            // If WebSocket exists, just subscribe this location
            this.subscribe(this.ws, { locationId, cityName, countryCode, token });
        }

        return this.ws;
    }

    subscribe(ws, params) {
        const { cityName, countryCode, token, locationId } = params;
        
        if (!locationId || ws.readyState !== WebSocket.OPEN) return false;

        try {
            this.logger.debug('Subscribing to location', { 
                locationId,
                cityName 
            });
            
            ws.send(JSON.stringify({
                action: 'subscribe',
                locationId,
                countryCode,
                token,
                isInitial: true
            }));

            // Request initial weather data
            this.refreshWeather(locationId, { countryCode, token });
            return true;
        } catch (error) {
            this.logger.error('Error subscribing', {
                error: error.message,
                locationId,
                cityName
            });
            return false;
        }
    }

    unsubscribe(cityName, params) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        try {
            this.ws.send(JSON.stringify({
                action: 'unsubscribe',
                locationName: cityName,
                countryCode: params.countryCode,
                token: params.token
            }));
            this.messageHandlers.delete(cityName);
        } catch (error) {
            this.logger.error('Error unsubscribing', {
                error: error.message,
                cityName
            });
        }
    }

    refreshWeather(locationId, params) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    
        try {
            this.ws.send(JSON.stringify({
                action: 'getWeather',
                locationId,  // Use locationId instead of locationName
                token: params.token
            }));
            return true;
        } catch (error) {
            this.logger.error('Error refreshing weather', {
                error: error.message,
                locationId
            });
            return false;
        }
    }

    cleanup(token) {
        this.logger.info('Starting WebSocket cleanup');
    
        if (this.ws && token) {
            // Get all registered locations
            const locations = Array.from(this.messageHandlers.keys());
            this.logger.debug('Cleaning up locations', { locations });
    
            // Send unsubscribe for each location
            locations.forEach(cityName => {
                try {
                    if (this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            action: 'unsubscribe',
                            locationName: cityName,
                            token,
                            isCleanup: true  // Tell backend this is final cleanup
                        }));
                    }
                } catch (error) {
                    this.logger.error('Error unsubscribing location during cleanup', {
                        error: error.message,
                        cityName
                    });
                }
            });
    
            // Wait a moment for messages to be processed
            setTimeout(() => {
                try {
                    this.ws.close(1000, 'Cleanup initiated');
                } catch (error) {
                    this.logger.error('Error closing WebSocket', {
                        error: error.message
                    });
                }
            }, 500);
        }
    
        this.ws = null;
        this.messageHandlers.clear();
        
        this.logger.info('WebSocket cleanup completed');
    }
}

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const logger = useLogger();
    const webSocketService = useMemo(() => new WebSocketService(logger), [logger]);
    const lastValidToken = useRef(user?.token);
    
    useEffect(() => {
        if (user?.token) {
            lastValidToken.current = user.token;
        } else if (lastValidToken.current) {
            webSocketService.cleanup(lastValidToken.current);
            lastValidToken.current = null;
        }
    }, [user, webSocketService]);

    useEffect(() => {
        const handleLogoutStarted = (event) => {
            const token = event.detail?.token || lastValidToken.current;
            if (token) {
                webSocketService.cleanup(token);
            }
        };

        window.addEventListener('auth-logout-started', handleLogoutStarted);
        return () => {
            window.removeEventListener('auth-logout-started', handleLogoutStarted);
        };
    }, [webSocketService]);

    return (
        <WebSocketContext.Provider value={webSocketService}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
}

export default WebSocketContext;