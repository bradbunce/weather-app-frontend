import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useLogger } from '@bradbunce/launchdarkly-react-logger';
import { useWebSocket } from './WebSocketContext';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;
const LocationsContext = createContext(null);

axios.defaults.headers.common['Content-Type'] = 'application/json';

export const LocationsProvider = ({ children }) => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, registerLoginCallback } = useAuth();
  const logger = useLogger();
  const webSocket = useWebSocket();

  const fetchLocations = useCallback(async () => {
    if (!user?.username) {
      logger.info("Skipping locations fetch - no user");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logger.debug("Fetching locations", {
        baseURL: LOCATIONS_API_URL,
        username: user.username
      });

      const response = await axios.get(`${LOCATIONS_API_URL}/locations`);

      let locationData;
      if (response.data?.locations) {
        locationData = response.data.locations;
      } else if (Array.isArray(response.data)) {
        locationData = response.data;
      } else {
        logger.warn("Unexpected locations data format:", response.data);
        locationData = [];
      }

      setLocations(locationData.map(loc => ({...loc})));
      logger.info("Locations fetched successfully", { count: locationData.length });
      
    } catch (err) {
      logger.error("Failed to fetch locations", {
        error: err.message,
        response: err.response?.data
      });

      let errorMessage = "Failed to fetch locations";
      if (err.response?.status === 401) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (err.response?.status === 403) {
        errorMessage = "Authentication error. Please check your login status.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      setError(errorMessage);
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, logger]);

  const addLocation = useCallback(async (newLocationData) => {
    try {
      setError(null);
      const response = await axios.post(
        `${LOCATIONS_API_URL}/locations`,
        newLocationData
      );
      
      // Get the new location data from response
      const newLocation = response.data;
      
      // Update locations list
      await fetchLocations();
      
      // Set up WebSocket handler for the new location
      if (webSocket && newLocation?.location_id) {
        logger.debug("Setting up WebSocket for new location", { 
          locationId: newLocation.location_id 
        });
        
        // Request weather data for the new location
        webSocket.refreshWeather([newLocation.location_id]);
      }
      
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add location");
      throw err;
    }
  }, [fetchLocations, setError, webSocket, logger]);

  const removeLocation = useCallback(async (locationId) => {
    try {
      setError(null);
      setLocations(prev => prev.filter(loc => loc.location_id !== locationId));
      await axios.delete(`${LOCATIONS_API_URL}/locations/${locationId}`);
      logger.info("Location removed successfully", { locationId });
      return true;
    } catch (err) {
      await fetchLocations();
      logger.error("Failed to remove location", {
        error: err.message,
        locationId
      });
      setError(err.response?.data?.message || "Failed to remove location");
      throw err;
    }
  }, [logger, fetchLocations]);

  useEffect(() => {
    if (webSocket) {
      webSocket.addLocationHandler('locations', {
        onMessage: (msg) => {
          logger.debug("Processing WebSocket message", {
            type: msg.type,
            dataCount: msg.data?.length,
            currentLocations: locations.length,
            newLocations: msg.data.map(l => l.location_id)
          });
          
          if (msg.type === 'locationUpdate' && Array.isArray(msg.data)) {
            setLocations(msg.data);
          }
        },
        onError: (error) => {
          logger.error("WebSocket location error", { error });
          setError("Lost connection to weather updates");
        }
      });
  
      return () => webSocket.removeLocationHandler('locations');
    }
  }, [webSocket, logger, locations]);

  useEffect(() => {
    logger.debug("Registering locations fetch callback with auth context");
    registerLoginCallback(fetchLocations);
  }, [registerLoginCallback, fetchLocations, logger]);

  useEffect(() => {
    if (user?.username) {
      setIsLoading(true);
      fetchLocations();
    }
  }, [user?.username, fetchLocations]);

  const value = {
    locations,
    isLoading,
    error,
    fetchLocations,
    addLocation,
    removeLocation,
    clearError: () => setError(null)
  };

  return (
    <LocationsContext.Provider value={value}>
      {children}
    </LocationsContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationsContext);
  if (!context) {
    throw new Error('useLocations must be used within a LocationsProvider');
  }
  return context;
};

export default LocationsContext;
