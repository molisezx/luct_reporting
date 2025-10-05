// client/src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId');
    const userData = localStorage.getItem('user');
    
    if (sessionId && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = sessionId;
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });
      
      const { sessionId, user } = response.data;
      
      localStorage.setItem('sessionId', sessionId);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = sessionId;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post('http://localhost:5000/api/auth/register', userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    // Call logout endpoint to clear server session
    if (sessionId) {
      try {
        await axios.post('http://localhost:5000/api/auth/logout', {}, {
          headers: { 'Authorization': sessionId }
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with client-side cleanup even if server call fails
      }
    }
    
    // Clear client-side storage
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // Function to check if session is still valid
  const checkSession = async () => {
    const sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      logout();
      return false;
    }

    try {
      // Use a simple endpoint to validate session
      await axios.get('http://localhost:5000/api/health', {
        headers: { 'Authorization': sessionId }
      });
      return true;
    } catch (error) {
      // Session is invalid, logout
      logout();
      return false;
    }
  };

  // Optional: Add axios interceptor to handle session expiry
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // Session expired or invalid
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  const value = {
    user,
    login,
    register,
    logout,
    checkSession,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}