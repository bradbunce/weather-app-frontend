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
        
        if (!cityName) {
            this.logger.warn('Attempted to connect with null/undefined cityName', {
                params,
                stack: new Error().stack
            });
            return;
        }
        
        if (this.connections.has(cityName)) {
            this.logger.debug('WebSocket connection already exists', { 
                cityName,
                existingConnection: {
                    readyState: this.connections.get(cityName).readyState,
                    timestamp: new Date().toISOString()
                }
            });
            return;
        }

        try {
            const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
            const ws = new WebSocket(websocketUrl);

            ws.onopen = () => {
                this.logger.info('WebSocket connected', { 
                    cityName,
                    connectionCount: this.connections.size,
                    activeConnections: Array.from(this.connections.keys())
                });
                
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
        
        if (!cityName) {
            this.logger.warn('Attempted to subscribe with null/undefined cityName', {
                params,
                stack: new Error().stack
            });
            return;
        }
        
        if (ws.readyState === WebSocket.OPEN) {
            this.logger.debug('Subscribing to location', {
                cityName,
                countryCode,
                connectionState: ws.readyState
            });

            ws.send(JSON.stringify({
                action: 'subscribe',
                locationName: cityName,
                countryCode,
                token
            }));
        } else {
            this.logger.warn('Attempted to subscribe when socket not open', {
                cityName,
                socketState: ws.readyState
            });
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
        logger.debug('WebSocketProvider auth state changed', {
            hasUser: Boolean(user),
            connectionCount: webSocketService.connections.size,
            activeConnections: Array.from(webSocketService.connections.keys())
        });

        if (!user) {
            logger.info('Cleaning up WebSocket connections on logout/unmount');
            webSocketService.cleanup(user?.token);
        }
    }, [user, webSocketService, logger]);

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

export function useWebSocketCleanup() {
    const context = useContext(WebSocketContext);
    const logger = useLogger();
    
    return useCallback(async (token) => {
        if (!context) {
            logger.warn('Attempted cleanup outside WebSocket context');
            return;
        }
        
        logger.info('Starting WebSocket cleanup', {
            connectionCount: context.connections.size,
            activeConnections: Array.from(context.connections.keys())
        });
        
        await context.cleanup(token);
        
        logger.info('WebSocket cleanup completed');
    }, [context, logger]);
}

export default WebSocketContext;