import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials) => {
    try {
      const response = await axios.post(
        'https://ian5p3n5ad.execute-api.us-east-1.amazonaws.com/production/login',
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

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Store the token
      const { token, user: userData } = response.data;
      // You might want to store the token in localStorage
      localStorage.setItem('authToken', token);
      
      // Set the user data and authentication state
      setUser(userData);
      setIsAuthenticated(true);

      // Configure axios to use the token for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      // Clear any existing auth state on error
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authToken');
      delete axios.defaults.headers.common['Authorization'];
      return false;
    }
  };

  const logout = () => {
    // Clear auth state and token
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
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