import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser, setLoading } from '../store/authSlice';
import { addNotification } from '../store/uiSlice';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';

const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          await dispatch(getCurrentUser()).unwrap();
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Token might be invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      } else {
        dispatch(setLoading(false));
      }
    };

    initializeAuth();
  }, [dispatch]);

  // Manage socket lifecycle when user auth state changes
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    const s = connectSocket();

    const onNotification = (payload) => {
      console.log('Received notification:', payload);
      dispatch(addNotification({
        id: payload.id || Date.now(),
        type: payload.type || 'system',
        message: payload.message,
        timestamp: payload.timestamp || new Date().toISOString(),
        read: false,
      }));
    };

    s.on('connect', () => {
      console.log('Socket connected successfully');
    });

    s.on('notification', onNotification);
    s.on('connect_error', (err) => console.warn('WS connect_error', err?.message));
    s.on('reconnect', () => {
      console.log('WS reconnected');
      // Optionally, re-fetch latest unread notifications here if needed
    });

    return () => {
      s.off('notification', onNotification);
    };
  }, [user, dispatch]);

  return children;
};

export default AuthProvider;