import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('neural_nexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('neural_nexus_token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token && !!user;

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // Backend uses OAuth2 password flow (form data, not JSON)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('neural_nexus_token', access_token);
      localStorage.setItem('neural_nexus_user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      return true;
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/register', { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('neural_nexus_token', access_token);
      localStorage.setItem('neural_nexus_user', JSON.stringify(userData));
      
      setToken(access_token);
      setUser(userData);
      return true;
    } catch (err) {
      const message = err.response?.data?.detail || 'Registration failed. Please try again.';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('neural_nexus_token');
    localStorage.removeItem('neural_nexus_user');
    setToken(null);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Verify token on mount
  useEffect(() => {
    if (token) {
      api.get('/auth/me').catch(() => {
        logout();
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading, error, isAuthenticated,
      login, register, logout, clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
