import React, { 
    createContext, 
    useContext,  
    useMemo, 
    useEffect 
} from 'react';
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
        
        // Validate input parameters
        if (!cityName) {
            this.logger.warn('Attempted to connect with null/undefined cityName', {
                params,
                stack: new Error().stack
            });
            return null;
        }

        if (!token) {
            this.logger.warn('Attempted to connect without token', {
                cityName,
                stack: new Error().stack
            });
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
            }
        }

        try {
            const websocketUrl = `${process.env.REACT_APP_WEBSOCKET_API}?token=${encodeURIComponent(token)}`;
            const ws = new WebSocket(websocketUrl);

            ws.onopen = () => {
                // Only store the connection after it's successfully opened
                this.connections.set(cityName, ws);

                this.logger.info('WebSocket connected', { 
                    cityName,
                    connectionCount: this.connections.size,
                    activeConnections: Array.from(this.connections.keys())
                });
                
                // Subscribe to weather updates
                if (countryCode) {
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
                this.logger.debug('WebSocket closed', { 
                    cityName,
                    remainingConnections: Array.from(this.connections.keys()).filter(c => c !== cityName)
                });
                this.connections.delete(cityName);
            };

            return ws;
        } catch (error) {
            this.logger.error('Failed to establish connection', {
                error: error.message,
                cityName,
                stack: error.stack
            });
            onError?.('Failed to establish connection');
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
                connectionState: ws.readyState
            });
    
            try {
                ws.send(JSON.stringify({
                    action: 'subscribe',
                    locationName: cityName,
                    countryCode,
                    token
                }));
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

        // Send logout message through any open connection
        const connections = Array.from(this.connections.values());
        const anyConnection = connections.find(conn => conn.readyState === WebSocket.OPEN);
        
        if (anyConnection) {
            try {
                anyConnection.send(JSON.stringify({
                    action: 'logout',
                    token
                }));
                this.logger.debug('Sent logout message successfully');
            } catch (error) {
                this.logger.error('Error sending logout message', {
                    error: error.message
                });
            }
        }

        // Close all connections
        for (const [cityName] of this.connections) {
            try {
                this.unsubscribe(cityName, { token });
            } catch (error) {
                this.logger.error('Error during cleanup', {
                    error: error.message,
                    cityName
                });
            }
        }

        // Ensure connections are cleared
        this.connections.clear();
        this.logger.info('WebSocket cleanup completed');
    }
}

export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    const logger = useLogger();

    const webSocketService = useMemo(() => new WebSocketService(logger), [logger]);

    // Listen for logout events
    useEffect(() => {
        const handleLogoutStarted = async (event) => {
            const token = event.detail?.token;
            logger.info('Starting WebSocket cleanup on logout', {
                connectionCount: webSocketService.connections.size,
                activeConnections: Array.from(webSocketService.connections.keys())
            });
            await webSocketService.cleanup(token);
        };

        window.addEventListener('auth-logout-started', handleLogoutStarted);
        
        return () => {
            window.removeEventListener('auth-logout-started', handleLogoutStarted);
        };
    }, [webSocketService, logger]);

    // Cleanup on unmount or when user is null
    useEffect(() => {
        if (!user) {
            logger.info('Cleaning up WebSocket connections on unmount/user null');
            webSocketService.cleanup(user?.token);
        }
        // Note: The effect depends on user, but we safely handle null/undefined
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

export default WebSocketContext;