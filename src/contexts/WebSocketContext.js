import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useLogger } from "../utils/logger";

const WebSocketContext = createContext(null);

class WebSocketService {
  constructor(logger) {
    this.ws = null;
    this.messageHandlers = new Map(); // locationId -> handler mapping
    this.logger = logger;
    this.userId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectTimeout = null;
  }

  connect(params) {
    const { token } = params;

    // Use the numeric userId from the token
    const tokenParts = token.split(".");
    const tokenPayload = JSON.parse(
      atob(
        tokenParts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(
            tokenParts[1].length + ((4 - (tokenParts[1].length % 4)) % 4),
            "="
          )
      )
    );
    const numericUserId = String(tokenPayload.userId);

    if (!token || !numericUserId) {
      this.logger.error("Missing required connection parameters", {
        hasToken: !!token,
        hasUserId: !!numericUserId,
      });
      return null;
    }

    this.userId = numericUserId;

    // Only create new connection if none exists or if it's closed
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        const websocketUrl = `${
          process.env.REACT_APP_WEBSOCKET_API
        }?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(
          numericUserId
        )}`;

        this.ws = new WebSocket(websocketUrl);

        this.ws.onopen = () => {
          this.logger.info("WebSocket connected", { userId: numericUserId });
          this.reconnectAttempts = 0;

          // Subscribe all existing locations
          this.subscribeAllLocations(token);
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.logger.debug("Raw WebSocket message", { message });
            this.logger.debug("Received WebSocket message", {
              type: message.type,
              dataCount: message.data?.length,
            });
        
            if (message.type === "locationUpdate") {
              const handler = this.messageHandlers.get('locations');
              if (handler) {
                handler.onMessage(message);
              }
              return;
            }

            // Handle weather updates
            if (Array.isArray(message.data)) {
              message.data.forEach((locationData) => {
                const id = parseInt(locationData.id);
                const handler = this.messageHandlers.get(id);

                if (handler && locationData.weather) {
                  handler.onMessage({
                    type: message.type,
                    data: {
                      temperature: locationData.weather.temperature,
                      condition: locationData.weather.condition,
                      humidity: locationData.weather.humidity,
                      windSpeed: locationData.weather.windSpeed,
                      feelsLike: locationData.weather.feelsLike,
                      timestamp: locationData.weather.lastUpdated,
                    },
                  });
                }
              });
            }
          } catch (err) {
            this.logger.error("Error processing WebSocket message", {
              error: err.message,
              rawData: event.data,
            });
          }
        };

        this.ws.onerror = (error) => {
          this.logger.error("WebSocket error", {
            error: error.message || "Unknown WebSocket error",
            errorObject: error,
            userId: numericUserId,
          });

          // More detailed error handling
          if (error instanceof Event) {
            this.logger.error("WebSocket connection failed", {
              readyState: this.ws.readyState,
              url: this.ws.url,
            });
          }

          this.handleConnectionError();
        };

        this.ws.onclose = (event) => {
          this.logger.debug("WebSocket closed", {
            userId: numericUserId,
            code: event.code,
            reason: event.reason,
          });
          this.handleConnectionClose();
        };
      } catch (error) {
        this.logger.error("Failed to establish WebSocket connection", {
          error: error.message,
          userId: numericUserId,
        });
        this.handleConnectionError();
        return null;
      }
    }

    return this.ws;
  }

  handleConnectionError() {
    // Notify all handlers of the error
    for (const handler of this.messageHandlers.values()) {
      handler.onError?.("Connection error");
    }

    this.attemptReconnect();
  }

  handleConnectionClose() {
    this.ws = null;
    this.attemptReconnect();
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

      this.logger.debug("Scheduling reconnection attempt", {
        attempt: this.reconnectAttempts,
        delay,
      });

      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        if (this.userId) {
          const token = localStorage.getItem("authToken"); // Use consistent storage key
          this.connect({ token, userId: this.userId });
        }
      }, delay);
    }
  }

  subscribeAllLocations(token) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    try {
      const locations = Array.from(this.messageHandlers.keys());

      if (locations.length > 0) {
        this.logger.debug("Subscribing to locations", {
          locationCount: locations.length,
          locations,
        });

        // Retrieve the token from storage if not provided
        const currentToken = token || this.getStoredToken();

        if (!currentToken) {
          this.logger.error("No token available for location subscription");
          return;
        }

        this.ws.send(
          JSON.stringify({
            action: "getWeather",
            locations,
            token: currentToken, // Explicitly pass the token
          })
        );
      }
    } catch (error) {
      this.logger.error("Error subscribing to locations", {
        error: error.message,
      });
    }
  }

  getStoredToken() {
    // Use the key from your AuthContext
    return localStorage.getItem("authToken");
  }

  // Add a method to get active location IDs
  getActiveLocationIds() {
    return Array.from(this.messageHandlers.keys());
  }

  addLocationHandler(locationId, handlers) {
    this.messageHandlers.set(locationId, handlers);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.refreshWeather([locationId], this.getStoredToken());
    }
  }

  removeLocationHandler(locationId) {
    this.messageHandlers.delete(locationId);
  }

  refreshWeather(locationIds, token) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;

    try {
        // Retrieve the token from storage if not provided
        const currentToken = token || this.getStoredToken();

        if (!currentToken) {
            this.logger.error('No token available for weather refresh');
            return false;
        }

        this.ws.send(
            JSON.stringify({
                action: "getWeather",
                locations: Array.isArray(locationIds) ? locationIds : [locationIds],
                token: currentToken,
            })
        );
        return true;
    } catch (error) {
        this.logger.error("Error refreshing weather", {
            error: error.message,
            locationIds,
        });
        return false;
    }
}

  cleanup() {
    this.logger.info("Starting WebSocket cleanup", { userId: this.userId });

    clearTimeout(this.reconnectTimeout);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.close(1000, "Cleanup initiated");
      } catch (error) {
        this.logger.error("Error closing WebSocket", {
          error: error.message,
          userId: this.userId,
        });
      }
    }

    this.ws = null;
    this.messageHandlers.clear();
    this.userId = null;
    this.reconnectAttempts = 0;

    this.logger.info("WebSocket cleanup completed");
  }
}

export function WebSocketProvider({ children }) {
  const { user } = useAuth();
  const logger = useLogger();
  const webSocketService = useMemo(
    () => new WebSocketService(logger),
    [logger]
  );

  useEffect(() => {
    if (user?.token && user?.id) {
      webSocketService.connect({
        token: user.token,
      });
    } else {
      webSocketService.cleanup();
    }

    return () => {
      webSocketService.cleanup();
    };
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
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}

export default WebSocketContext;
