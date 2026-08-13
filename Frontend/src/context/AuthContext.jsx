import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('emr_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('emr_token') || '');

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      if (res.data.success) {
        const { token: jwtToken, user: userData } = res.data.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('emr_user', JSON.stringify(userData));
        localStorage.setItem('emr_token', jwtToken);
        return { success: true, user: userData };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (registerData) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, registerData);
      if (res.data.success) {
        const { token: jwtToken, user: userData } = res.data.data;
        setUser(userData);
        setToken(jwtToken);
        localStorage.setItem('emr_user', JSON.stringify(userData));
        localStorage.setItem('emr_token', jwtToken);
        return { success: true, user: userData };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  };

  const updateUser = (updatedFields) => {
    setUser(prev => {
      const newUserData = { ...prev, ...updatedFields };
      localStorage.setItem('emr_user', JSON.stringify(newUserData));
      return newUserData;
    });
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('emr_user');
    localStorage.removeItem('emr_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
