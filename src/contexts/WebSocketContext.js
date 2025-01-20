import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useLogger } from '../utils/logger';

const WebSocketContext = createContext(null);

// WebSocket Service class
class WebSocketService {
    constructor(logger) {
        this.connections = new Map(); // connectionId -> WebSocket
        this.logger = logger;
    }

    connect(params) {
        const { token, cityName, countryCode, onMessage, onError } = params;
        
        if (this.connections.has(cityName)) {
            this.logger.debug('WebSocket connection already exists', { cityName });
            return;
        }

        try {
            const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
            const ws = new WebSocket(websocketUrl);

            ws.onopen = () => {
                this.logger.info('WebSocket connected', { cityName });
                
                // Subscribe to weather updates
                if (cityName && countryCode) {
                    this.subscribe(ws, { cityName, countryCode, token });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.logger.debug('Received WebSocket message', {
                        type: data.type,
                        cityName
                    });

                    if (data.type === 'error') {
                        onError?.(data.message);
                        return;
                    }

                    onMessage?.(data);
                } catch (err) {
                    this.logger.error('Error processing message', {
                        error: err.message,
                        cityName
                    });
                    onError?.('Error processing weather data');
                }
            };

            ws.onerror = (error) => {
                this.logger.error('WebSocket error', {
                    error: error.message,
                    cityName
                });
                onError?.('Connection error');
            };

            ws.onclose = () => {
                this.logger.debug('WebSocket closed', { cityName });
                this.connections.delete(cityName);
            };

            this.connections.set(cityName, ws);
            return ws;
        } catch (error) {
            this.logger.error('Failed to establish connection', {
                error: error.message,
                cityName
            });
            onError?.('Failed to establish connection');
        }
    }

    subscribe(ws, params) {
        const { cityName, countryCode, token } = params;
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: 'subscribe',
                locationName: cityName,
                countryCode,
                token
            }));
        }
    }

    unsubscribe(cityName, params) {
        const ws = this.connections.get(cityName);
        if (!ws) return;

        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: 'unsubscribe',
                    locationName: cityName,
                    countryCode: params.countryCode,
                    token: params.token
                }));
            }
        } catch (error) {
            this.logger.error('Error unsubscribing', {
                error: error.message,
                cityName
            });
        } finally {
            this.closeConnection(cityName);
        }
    }

    closeConnection(cityName) {
        const ws = this.connections.get(cityName);
        if (ws) {
            ws.close();
            this.connections.delete(cityName);
        }
    }

    refreshWeather(cityName, params) {
        const ws = this.connections.get(cityName);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            ws.send(JSON.stringify({
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
        // Send logout message to server
        const anyConnection = this.connections.values().next().value;
        if (anyConnection?.readyState === WebSocket.OPEN) {
            try {
                anyConnection.send(JSON.stringify({
                    action: 'logout',
                    token
                }));
            } catch (error) {
                this.logger.error('Error sending logout message', {
                    error: error.message
                });
            }
        }

        // Close all connections
        for (const [cityName, ws] of this.connections) {
            try {
                ws.close();
            } catch (error) {
                this.logger.error('Error closing connection', {
                    error: error.message,
                    cityName
                });
            }
        }

        this.connections.clear();
    }
}

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const logger = useLogger();

    const webSocketService = useMemo(() => new WebSocketService(logger), [logger]);

    // Cleanup on logout
    useEffect(() => {
        if (!user) {
            webSocketService.cleanup(user?.token);
        }
    }, [user, webSocketService]);

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