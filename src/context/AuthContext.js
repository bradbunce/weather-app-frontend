import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const AUTH_API_URL = process.env.REACT_APP_AUTH_API;
const TOKEN_STORAGE_KEY = 'authToken';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (storedToken) {
        try {
          // For auth API, use Bearer prefix
          const response = await axios.get(`${AUTH_API_URL}/validate-token`, {
            headers: {
              Authorization: formatTokenForApi(storedToken, true)
            }
          });

          const userData = response.data.user;
          // Store the raw token in the user object
          setUser({ ...userData, token: storedToken });
          setIsAuthenticated(true);
          // For default axios headers, use Bearer prefix
          axios.defaults.headers.common['Authorization'] = formatTokenForApi(storedToken, true);
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

      const responseData = typeof response.data === 'string' 
        ? JSON.parse(response.data) 
        : response.data;

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      const { token, user: userData } = responseData;

      console.log('TOKEN DETAILS:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        decodedPayload: jwt.decode(token)
      });

      if (!token || !userData) {
        throw new Error('Invalid response format from server');
      }

      // Store raw token
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Include raw token in user object
      setUser({ ...userData, token });
      setIsAuthenticated(true);
      // Use Bearer prefix for default axios headers
      axios.defaults.headers.common['Authorization'] = formatTokenForApi(token, true);

      return true;
    } catch (error) {
      console.error('Login failed:', {
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
    try {
      const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (currentToken) {
        await axios.post(`${AUTH_API_URL}/logout`, {}, {
          headers: {
            Authorization: formatTokenForApi(currentToken, true)
          }
        });
      }
    } catch (error) {
      console.warn('Logout notification failed:', error.message);
    } finally {
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
      console.error('Token refresh failed:', error.message);
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