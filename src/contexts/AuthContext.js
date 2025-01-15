import React, { createContext, useContext, useState, useEffect } from 'react';
import { withLDConsumer } from "launchdarkly-react-client-sdk";
import axios from 'axios';
import { useLogger } from '../utils/logger';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;
const TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext(null);

/**
 * AuthProvider Component
 * Manages authentication state and provides auth-related functionality to the app.
 * Wrapped with LaunchDarkly consumer for feature flag access.
 */
const AuthProviderComponent = ({ children, flags }) => {
  const logger = useLogger();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Format token based on API needs
  const formatTokenForApi = (token, needsBearer = true) => {
    return needsBearer ? `Bearer ${token}` : token;
  };

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      logger.info('Initializing authentication state');
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (storedToken) {
        logger.debug('Found stored token, validating...');
        try {
          // For auth API, use Bearer prefix
          const response = await axios.get(`${AUTH_API_URL}/validate-token`, {
            headers: {
              Authorization: formatTokenForApi(storedToken, true)
            }
          });

          const userData = response.data.user;
          logger.info('Token validation successful', { userId: userData.id });
          // Store the raw token in the user object
          setUser({ ...userData, token: storedToken });
          setIsAuthenticated(true);
          // For default axios headers, use Bearer prefix
          axios.defaults.headers.common['Authorization'] = formatTokenForApi(storedToken, true);
        } catch (error) {
          logger.warn('Stored token validation failed', {
            error: error.message,
            stack: error.stack
          });
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setIsLoading(false);
      logger.debug('Auth initialization complete', {
        isAuthenticated: Boolean(storedToken),
        hasValidToken: Boolean(user)
      });
    };

    initializeAuth();
  }, [logger]);

  const login = async (credentials) => {
    logger.info('Attempting login', { username: credentials.username });
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${AUTH_API_URL}/login`,
        {
          username: credentials.username,
          password: credentials.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      const responseData = typeof response.data === 'string'
        ? JSON.parse(response.data)
        : response.data;
  
      if (responseData.error) {
        throw new Error(responseData.error);
      }
  
      const { token, user: userData } = responseData;
  
      // Manual token inspection
      logger.debug('Token details:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        tokenParts: token.split('.').map((part, index) => {
          if (index === 2) return 'Signature';
          try {
            // Decode base64 and parse JSON
            const decodedPart = atob(
              part.replace(/-/g, '+').replace(/_/g, '/')
                .padEnd(part.length + (4 - part.length % 4) % 4, '=')
            );
            return JSON.parse(decodedPart);
          } catch (error) {
            return 'Decoding Failed';
          }
        })
      });
  
      if (!token || !userData) {
        logger.error('Invalid server response format', { 
          hasToken: Boolean(token), 
          hasUserData: Boolean(userData) 
        });
        throw new Error('Invalid response format from server');
      }
  
      // Store raw token
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Include raw token in user object
      setUser({ ...userData, token });
      setIsAuthenticated(true);
      // Use Bearer prefix for default axios headers
      axios.defaults.headers.common['Authorization'] = formatTokenForApi(token, true);
  
      logger.info('Login successful', { 
        userId: userData.id,
        username: userData.username 
      });
      return true;
    } catch (error) {
      logger.error('Login failed', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
  
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common['Authorization'];
  
      throw new Error(
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    logger.info('Initiating logout process');
    try {
      // Close WebSocket connections first and wait for them to close
      if (window.activeWebSockets) {
        logger.debug(`Closing WebSocket connections`, {
          connectionCount: window.activeWebSockets.size
        });
        const closePromises = Array.from(window.activeWebSockets).map(ws => {
          return new Promise((resolve) => {
            // Set up onclose handler before closing
            const originalOnClose = ws.onclose;
            ws.onclose = (event) => {
              if (originalOnClose) originalOnClose.call(ws, event);
              resolve();
            };
            
            try {
              // Attempt to send unsubscribe message
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'unsubscribe' }));
              }
              ws.close();
            } catch (error) {
              logger.error('Error closing WebSocket', {
                error: error.message,
                stack: error.stack
              });
              resolve(); // Resolve even on error to continue logout
            }
          });
        });

        // Wait for all WebSockets to close with a timeout
        await Promise.race([
          Promise.all(closePromises),
          new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
        ]);
        window.activeWebSockets.clear();
      }
  
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        try {
          await axios.post(`${AUTH_API_URL}/logout`, {}, {
            headers: {
              Authorization: formatTokenForApi(currentToken, true)
            }
          });
        } catch (error) {
          logger.warn('Logout API notification failed', {
            error: error.message,
            stack: error.stack
          });
        }
      }
    } catch (error) {
      logger.error('Logout process error', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      // Dispatch event to notify components about logout
      window.dispatchEvent(new Event('auth-logout'));
      
      // Clear user state and authentication
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common['Authorization'];
      logger.info('Logout complete');
    }
  };

  const refreshToken = async () => {
    logger.debug('Attempting token refresh');
    try {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!currentToken) {
        logger.warn('Token refresh failed - No token found');
        throw new Error('No token to refresh');
      }

      const response = await axios.post(
        `${AUTH_API_URL}/refresh-token`,
        {},
        {
          headers: {
            Authorization: formatTokenForApi(currentToken, true)
          }
        }
      );

      const { token: newToken } = response.data;

      if (!newToken) {
        throw new Error('No token received from server');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setUser(prev => ({ ...prev, token: newToken }));
      axios.defaults.headers.common['Authorization'] = formatTokenForApi(newToken, true);

      return true;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        stack: error.stack
      });
      logout();
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken
  };

  if (isLoading) {
    logger.trace('Rendering loading state');
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

// Export the LaunchDarkly wrapped AuthProvider
export const AuthProvider = withLDConsumer()(AuthProviderComponent);