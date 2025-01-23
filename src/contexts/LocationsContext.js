import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { useLogger } from '../utils/logger';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;
const LocationsContext = createContext(null);

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

      setLocations(locationData);
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

  // Register the fetchLocations callback with AuthContext
  useEffect(() => {
    logger.debug("Registering locations fetch callback with auth context");
    registerLoginCallback(fetchLocations);
  }, [registerLoginCallback, fetchLocations, logger]);

  // Fetch locations when component mounts if user is already logged in
  useEffect(() => {
    if (user?.username) {
      setIsLoading(true);
      fetchLocations();
    }
  }, [user?.username, fetchLocations]);

  const addLocation = useCallback(async (newLocationData) => {
    try {
      setError(null);
  
      // Post new location
      const response = await axios.post(
        `${LOCATIONS_API_URL}/locations`,
        newLocationData
      );
      
      // Get the location_id from the response
      const locationId = response.data.location_id;
      
      // Poll for weather data
      let attempts = 0;
      const maxAttempts = 10; // Try for up to 10 seconds
      let locationWithWeather = null;

      while (attempts < maxAttempts) {
        const pollResponse = await axios.get(`${LOCATIONS_API_URL}/locations`);
        const pollLocations = Array.isArray(pollResponse.data) ? pollResponse.data : pollResponse.data?.locations || [];
        const foundLocation = pollLocations.find(loc => loc.location_id === locationId);
        
        if (foundLocation?.temp_f && 
            foundLocation?.humidity && 
            foundLocation?.condition_text && 
            foundLocation?.wind_mph) {
          locationWithWeather = foundLocation;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (locationWithWeather) {
        setLocations(prev => [...prev, locationWithWeather]);
      } else {
        logger.warn("Weather data not available after polling", { locationId });
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add location");
      throw err;
    }
  }, [logger]);

  const removeLocation = useCallback(async (locationId) => {
    try {
      setError(null);
      
      // Remove location immediately for better UX
      setLocations(prev => prev.filter(loc => loc.location_id !== locationId));
      
      // Then make the API call
      await axios.delete(`${LOCATIONS_API_URL}/locations/${locationId}`);
      logger.info("Location removed successfully", { locationId });
      
      return true;
    } catch (err) {
      // If API call fails, revert the removal
      await fetchLocations();
      logger.error("Failed to remove location", {
        error: err.message,
        locationId
      });
      setError(err.response?.data?.message || "Failed to remove location");
      throw err;
    }
  }, [logger, fetchLocations]);

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
