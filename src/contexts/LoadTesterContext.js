import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { useLogger } from '@bradbunce/launchdarkly-react-logger';

const LOCATIONS_API_URL = process.env.REACT_APP_LOCATIONS_API;

const LoadTesterContext = createContext(null);

export const LoadTesterProvider = ({ children }) => {
  const logger = useLogger();

  // Test configuration and state
  const [isRunning, setIsRunning] = useState(false);
  const [queriesPerMinute, setQueriesPerMinute] = useState(30);
  const [metrics, setMetrics] = useState({
    totalQueries: 0,
    totalLocations: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    successCount: 0,
    errorCount: 0,
    startTime: null,
    lastQueryTime: null
  });

  // Refs for interval management
  const intervalRef = useRef(null);
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;

  const updateMetrics = useCallback((newData) => {
    setMetrics(prev => ({
      ...prev,
      ...newData,
      lastQueryTime: new Date()
    }));
  }, []);

  // Separate method to fetch locations without updating global state
  const fetchLocationsCount = useCallback(async () => {
    try {
      const response = await axios.get(`${LOCATIONS_API_URL}/locations`);
      let locationData;
      if (response.data?.locations) {
        locationData = response.data.locations;
      } else if (Array.isArray(response.data)) {
        locationData = response.data;
      } else {
        locationData = [];
      }
      return locationData.length;
    } catch (error) {
      logger.error("Failed to fetch locations count", { error: error.message });
      throw error;
    }
  }, [logger]);

  const executeQuery = useCallback(async () => {
    const startTime = performance.now();
    try {
      const locationCount = await fetchLocationsCount();
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      updateMetrics({
        totalQueries: metricsRef.current.totalQueries + 1,
        totalLocations: locationCount,
        averageResponseTime: (
          (metricsRef.current.averageResponseTime * metricsRef.current.totalQueries + responseTime) / 
          (metricsRef.current.totalQueries + 1)
        ),
        minResponseTime: Math.min(metricsRef.current.minResponseTime, responseTime),
        maxResponseTime: Math.max(metricsRef.current.maxResponseTime, responseTime),
        successCount: metricsRef.current.successCount + 1
      });

      logger.debug('Load test query completed', {
        responseTime,
        locationCount,
        totalQueries: metricsRef.current.totalQueries + 1
      });
    } catch (error) {
      updateMetrics({
        totalQueries: metricsRef.current.totalQueries + 1,
        errorCount: metricsRef.current.errorCount + 1
      });

      logger.error('Load test query failed', {
        error: error.message,
        totalQueries: metricsRef.current.totalQueries + 1
      });
    }
  }, [fetchLocationsCount, updateMetrics, logger]);

  const startTest = useCallback(() => {
    if (isRunning) return;

    const interval = (60 * 1000) / queriesPerMinute;
    setIsRunning(true);
    setMetrics(prev => ({
      ...prev,
      startTime: new Date(),
      minResponseTime: Infinity,
      maxResponseTime: 0
    }));

    intervalRef.current = setInterval(executeQuery, interval);
    executeQuery(); // Execute first query immediately

    logger.info('Load test started', { queriesPerMinute, interval });
  }, [queriesPerMinute, isRunning, executeQuery, logger]);

  const stopTest = useCallback(() => {
    if (!isRunning) return;

    clearInterval(intervalRef.current);
    setIsRunning(false);
    logger.info('Load test stopped', { 
      totalQueries: metrics.totalQueries,
      successRate: ((metrics.successCount / metrics.totalQueries) * 100).toFixed(2) + '%'
    });
  }, [isRunning, metrics, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const value = {
    isRunning,
    metrics,
    queriesPerMinute,
    setQueriesPerMinute,
    startTest,
    stopTest
  };

  return (
    <LoadTesterContext.Provider value={value}>
      {children}
    </LoadTesterContext.Provider>
  );
};

export const useLoadTester = () => {
  const context = useContext(LoadTesterContext);
  if (!context) {
    throw new Error('useLoadTester must be used within a LoadTesterProvider');
  }
  return context;
};

export default LoadTesterContext;
