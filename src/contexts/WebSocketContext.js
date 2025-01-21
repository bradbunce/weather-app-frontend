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
        const { token, cityName, countryCode, onMessage, onError } = params;
        
        this.logger.debug('Connection request', { 
            hasToken: !!token,
            cityName,
            countryCode
        });

        // Store the message handlers for this city
        this.messageHandlers.set(cityName, { onMessage, onError });

        // Create WebSocket if it doesn't exist
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            try {
                const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
                this.ws = new WebSocket(websocketUrl);

                this.ws.onopen = () => {
                    this.logger.info('WebSocket connected');
                    
                    // Subscribe all cities
                    for (const [city, cityHandlers] of this.messageHandlers.entries()) {
                        this.subscribe(this.ws, { 
                            cityName: city, 
                            countryCode, 
                            token 
                        });
                        cityHandlers.onMessage?.({ type: 'connect', cityName: city });
                    }
                };

                this.ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        
                        // Extract city name from the message data
                        const weatherData = data.data?.[0];
                        const messageCityName = weatherData?.name;
                        
                        this.logger.debug('WebSocket message received', {
                            messageType: data.type,
                            cityName: messageCityName,
                            rawData: JSON.stringify(data.data)
                        });
                
                        // Find the handler for this city
                        if (messageCityName) {
                            const cityHandler = this.messageHandlers.get(messageCityName);
                            if (cityHandler) {
                                cityHandler.onMessage({
                                    ...data,
                                    connectionCity: messageCityName
                                });
                            }
                        }
                    } catch (err) {
                        this.logger.error('Error processing message', {
                            error: err.message,
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
            // If WebSocket exists, just subscribe this city
            this.subscribe(this.ws, { cityName, countryCode, token });
        }

        return this.ws;
    }

    subscribe(ws, params) {
        const { cityName, countryCode, token } = params;
        
        if (!cityName || ws.readyState !== WebSocket.OPEN) return false;

        try {
            this.logger.debug('Subscribing to location', { cityName });
            ws.send(JSON.stringify({
                action: 'subscribe',
                locationName: cityName,
                countryCode,
                token
            }));

            // Request initial weather data
            this.refreshWeather(cityName, { countryCode, token });
            return true;
        } catch (error) {
            this.logger.error('Error subscribing', {
                error: error.message,
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

    refreshWeather(cityName, params) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

        try {
            this.ws.send(JSON.stringify({
                action: 'getWeather',
                locationName: cityName,
                countryCode: params.countryCode,
                token: params.token
            }));
            return true;
        } catch (error) {
            this.logger.error('Error refreshing weather', {
                error: error.message,
                cityName
            });
            return false;
        }
    }

    cleanup(token) {
        this.logger.info('Starting WebSocket cleanup');

        if (this.ws && token) {
            // Unsubscribe all cities
            for (const [cityName] of this.messageHandlers) {
                this.unsubscribe(cityName, { token });
            }

            try {
                this.ws.close(1000, 'Cleanup initiated');
            } catch (error) {
                this.logger.error('Error closing WebSocket', {
                    error: error.message
                });
            }
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