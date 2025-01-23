import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useLogger } from '../utils/logger';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;
const LocationsContext = createContext(null);

// Configure axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

export const LocationsProvider = ({ children }) => {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, registerLoginCallback } = useAuth();
  const logger = useLogger();

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
      
      const locationId = response.data.location_id;
      
      // Add the new location immediately with loading state
      setLocations(currentLocations => [
        ...currentLocations,
        {
          ...newLocationData,
          location_id: locationId,
          loading: true
        }
      ]);
      
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        const pollResponse = await axios.get(`${LOCATIONS_API_URL}/locations`);
        const pollLocations = Array.isArray(pollResponse.data) 
          ? pollResponse.data 
          : pollResponse.data?.locations || [];
          
        const foundLocation = pollLocations.find(loc => loc.location_id === locationId);
        
        if (foundLocation?.temp_f && 
            foundLocation?.humidity && 
            foundLocation?.condition_text && 
            foundLocation?.wind_mph) {
          
          setLocations(currentLocations => 
            currentLocations.map(loc => 
              loc.location_id === locationId 
                ? { ...foundLocation, loading: false }
                : loc
            )
          );
          
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      // If polling fails, remove the location
      setLocations(currentLocations => 
        currentLocations.filter(loc => loc.location_id !== locationId)
      );
      
      logger.warn("Weather data not available after polling", { locationId });
      return false;
      
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add location");
      throw err;
    }
  }, [logger]);

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

  // Register login callback
  useEffect(() => {
    logger.debug("Registering locations fetch callback with auth context");
    registerLoginCallback(fetchLocations);
  }, [registerLoginCallback, fetchLocations, logger]);

  // Initial fetch
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