import React, { 
    createContext, 
    useContext,  
    useMemo, 
    useEffect,
    useRef
} from 'react';
import { useAuth } from './AuthContext';
import { useLogger } from '../utils/logger';

const WebSocketContext = createContext(null);

// WebSocket Service class
class WebSocketService {
    constructor(logger) {
        this.connections = new Map(); // connectionId -> WebSocket
        this.connectionQueue = new Set(); // Track pending connections
        this.logger = logger;
        this.isConnecting = false;
    }

    async     connect(params) {
        const { token, cityName, countryCode, onMessage, onError } = params;
        
        // Track connection attempt for debugging
        this.logger.debug('Connection attempt', { 
            hasToken: !!token,
            hasCityName: !!cityName,
            cityName
        });
        
        // Add to connection queue if already connecting
        if (this.isConnecting) {
            this.connectionQueue.add(cityName);
            this.logger.debug('Connection queued', { cityName });
            return null;
        }
        
        this.isConnecting = true;
        
        // Enhance token validation
        if (!token || token.trim() === '') {
            this.logger.error('Invalid connection attempt', {
                reason: 'Missing or empty token',
                cityName,
                stack: new Error().stack
            });
            onError?.('Authentication required');
            return null;
        }
        
        // Enhanced location validation
        if (!cityName || cityName.trim() === '') {
            this.logger.error('Invalid connection attempt', {
                reason: 'Missing or empty cityName',
                token: 'present', // Don't log actual token
                stack: new Error().stack
            });
            onError?.('Invalid location name');
            return null;
        }
        
        // Check for existing connection
        const existingConnection = this.connections.get(cityName);
        if (existingConnection) {
            // Check if the existing connection is still valid
            if (existingConnection.readyState === WebSocket.OPEN) {
                this.logger.debug('Reusing existing WebSocket connection', { 
                    cityName,
                    existingConnectionState: existingConnection.readyState
                });
                return existingConnection;
            } else {
                // Remove stale connection
                this.connections.delete(cityName);
                this.logger.warn('Removed stale WebSocket connection', { 
                    cityName,
                    previousState: existingConnection.readyState
                });
            }
        }

        try {
            const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
            const ws = new WebSocket(websocketUrl);

            // Store the city name for reference in error handling
            ws.cityName = cityName;

            ws.onopen = () => {
                // Only store the connection after it's successfully opened
                this.connections.set(cityName, ws);

                this.logger.info('WebSocket connected', { 
                    cityName,
                    connectionCount: this.connections.size,
                    activeConnections: Array.from(this.connections.keys()),
                    queueSize: this.connectionQueue.size
                });

                // After connection is established and subscription is sent,
                // request initial weather data
                if (countryCode) {
                    this.subscribe(ws, { cityName, countryCode, token });
                    
                    // Add a small delay before requesting weather to ensure subscription is processed
                    setTimeout(() => {
                        this.logger.debug('Requesting initial weather data', {
                            cityName,
                            connectionState: ws.readyState
                        });
                        this.refreshWeather(cityName, { countryCode, token });
                    }, 500);
                }
                
                // Process next item in queue if any
                this.isConnecting = false;
                const nextCity = Array.from(this.connectionQueue)[0];
                if (nextCity) {
                    this.connectionQueue.delete(nextCity);
                    this.connect({
                        token,
                        cityName: nextCity,
                        countryCode,
                        onMessage,
                        onError
                    });
                }
                
                // Subscribe to weather updates
                if (countryCode) {
                    this.subscribe(ws, { cityName, countryCode, token });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Use the actual message's city name, not the connection's
                    const messageCityName = data.cityName || data.locationName || cityName;
                    
                    this.logger.debug('Raw WebSocket message received', {
                        type: data.type,
                        connectionCity: cityName,
                        messageCityName,
                        rawData: event.data
                    });

                    if (data.type === 'error') {
                        this.logger.error('WebSocket message error', {
                            error: data.message,
                            cityName
                        });
                        onError?.(data.message);
                        return;
                    }

                    onMessage?.(data);
                } catch (err) {
                    this.logger.error('Error processing message', {
                        error: err.message,
                        cityName,
                        rawData: event.data
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
                const remainingConnections = Array.from(this.connections.keys())
                    .filter(c => c !== cityName);
                
                this.logger.debug('WebSocket closed', { 
                    cityName,
                    remainingConnections
                });
                
                this.connections.delete(cityName);
            };

            return ws;
        } catch (error) {
            this.logger.error('Failed to establish connection', {
                error: error.message,
                cityName,
                stack: error.stack,
                queueSize: this.connectionQueue.size
            });
            onError?.('Failed to establish connection');
            
            // Reset connecting state and process next in queue
            this.isConnecting = false;
            const nextCity = Array.from(this.connectionQueue)[0];
            if (nextCity) {
                this.connectionQueue.delete(nextCity);
                this.connect({
                    token,
                    cityName: nextCity,
                    countryCode,
                    onMessage,
                    onError
                });
            }
            return null;
        }
    }

    subscribe(ws, params) {
        const { cityName, countryCode, token } = params;
        
        if (!cityName) {
            this.logger.warn('Attempted to subscribe with null/undefined cityName', {
                params,
                stack: new Error().stack
            });
            return false;
        }
        
        if (ws.readyState === WebSocket.OPEN) {
            this.logger.debug('Subscribing to location', {
                cityName,
                countryCode,
                connectionState: ws.readyState,
                connectionId: ws.url
            });
    
            try {
                const subscribeMessage = {
                    action: 'subscribe',
                    locationName: cityName,
                    countryCode,
                    token
                };
                this.logger.debug('Sending subscribe message', {
                    cityName,
                    message: subscribeMessage
                });
                ws.send(JSON.stringify(subscribeMessage));
                return true;
            } catch (error) {
                this.logger.error('Error subscribing', {
                    error: error.message,
                    cityName
                });
                return false;
            }
        } else {
            this.logger.warn('Attempted to subscribe when socket not open', {
                cityName,
                socketState: ws.readyState
            });
            return false;
        }
    }
    
    unsubscribe(cityName, params) {
        const ws = this.connections.get(cityName);
        if (!ws) {
            this.logger.debug('No connection found to unsubscribe', { cityName });
            return;
        }

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
            try {
                ws.close();
            } catch (error) {
                this.logger.error('Error closing connection', {
                    error: error.message,
                    cityName
                });
            } finally {
                this.connections.delete(cityName);
            }
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
        this.logger.info('Starting WebSocket cleanup', {
            connectionCount: this.connections.size,
            activeConnections: Array.from(this.connections.keys())
        });

        // Close all connections even if token is missing
        const connectionsCopy = Array.from(this.connections.entries());
        
        // First, attempt graceful disconnects for connections with valid tokens
        if (token) {
            connectionsCopy.forEach(([cityName, conn]) => {
                if (conn && conn.readyState === WebSocket.OPEN) {
                    try {
                        this.unsubscribe(cityName, { token });
                    } catch (error) {
                        this.logger.error('Error during graceful disconnect', {
                            error: error.message,
                            cityName
                        });
                    }
                }
            });
        }
        
        // Then force close any remaining connections
        connectionsCopy.forEach(([cityName, conn]) => {
            if (conn) {
                try {
                    conn.close(1000, 'Cleanup initiated');
                } catch (error) {
                    this.logger.error('Error force closing connection', {
                        error: error.message,
                        cityName
                    });
                }
                this.connections.delete(cityName);
            }
        });

        // Clear both connections and queue
        this.connections.clear();
        this.connectionQueue.clear();
        this.isConnecting = false;
        
        this.logger.info('WebSocket cleanup completed', {
            remainingConnections: Array.from(this.connections.keys()),
            queueLength: this.connectionQueue.size
        });
    }
}

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const logger = useLogger();
    const webSocketService = useMemo(() => new WebSocketService(logger), [logger]);
    
    // Store the last valid token for cleanup
    const lastValidToken = useRef(user?.token);
    
    useEffect(() => {
        if (user?.token) {
            lastValidToken.current = user.token;
        } else {
            // If user becomes null, ensure we cleanup immediately
            webSocketService.cleanup(lastValidToken.current);
            lastValidToken.current = null;
        }
    }, [user, webSocketService]);

    // Handle logout event
    useEffect(() => {
        const handleLogoutStarted = async (event) => {
            const token = event.detail?.token || lastValidToken.current;
            logger.info('Starting WebSocket cleanup on logout', {
                hasToken: !!token,
                connectionCount: webSocketService.connections.size
            });
            await webSocketService.cleanup(token);
        };

        window.addEventListener('auth-logout-started', handleLogoutStarted);
        return () => {
            window.removeEventListener('auth-logout-started', handleLogoutStarted);
        };
    }, [webSocketService, logger]);

    // Handle unmount and user state changes
    useEffect(() => {
        return () => {
            logger.info('Cleaning up WebSocket connections on unmount');
            webSocketService.cleanup(lastValidToken.current);
        };
    }, [webSocketService, logger]);

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