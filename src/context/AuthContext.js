import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;
const TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (storedToken) {
        try {
          // Validate token and get user data
          const response = await axios.get(`${AUTH_API_URL}/validate-token`, {
            headers: {
              Authorization: `Bearer ${storedToken}`
            }
          });

          const userData = response.data.user;
          setUser(userData);
          setIsAuthenticated(true);
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } catch (error) {
          console.warn('Stored token validation failed:', error.message);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
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

      // Handle both string and object responses
      const responseData = typeof response.data === 'string' 
        ? JSON.parse(response.data) 
        : response.data;

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { token, user: userData } = responseData;

      if (!token || !userData) {
        throw new Error('Invalid response format from server');
      }

      // Set auth state
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setUser(userData);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return true;
    } catch (error) {
      console.error('Login failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Clear auth state
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common['Authorization'];

      // Throw a user-friendly error
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
    try {
      // Attempt to notify the server
      await axios.post(`${AUTH_API_URL}/logout`);
    } catch (error) {
      console.warn('Logout notification failed:', error.message);
    } finally {
      // Clear auth state regardless of server response
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const refreshToken = async () => {
    try {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!currentToken) throw new Error('No token to refresh');

      const response = await axios.post(
        `${AUTH_API_URL}/refresh-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentToken}`
          }
        }
      );

      const { token: newToken } = response.data;

      if (!newToken) {
        throw new Error('No token received from server');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      // If refresh fails, log out the user
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
    return <div>Loading...</div>; // Or your loading component
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