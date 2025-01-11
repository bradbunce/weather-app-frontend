import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (credentials) => {
    try {
        console.log('Attempting login for user:', credentials.username);
        
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

        console.log('Login response:', {
            status: response.status,
            statusText: response.statusText,
            data: response.data
        });

        if (response.data.error) {
            throw new Error(response.data.error);
        }

        const { token, user: userData } = response.data;
        localStorage.setItem('authToken', token);
        setUser(userData);
        setIsAuthenticated(true);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        return true;
    } catch (error) {
        console.error('Login error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('authToken');
        delete axios.defaults.headers.common['Authorization'];
        
        throw error; // Re-throw to be handled by the component
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