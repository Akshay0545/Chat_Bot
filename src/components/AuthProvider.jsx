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
      console.log('No user, disconnecting socket');
      disconnectSocket();
      return;
    }

    console.log('User authenticated, connecting socket for user:', user.username);
    
    // Clean up any existing socket first
    disconnectSocket();
    
    let socketCleanup = null;
    
    // Small delay to ensure cleanup is complete
    const timer = setTimeout(() => {
      const s = connectSocket();
      
      if (!s) {
        console.error('Failed to create socket connection');
        return;
      }

      const onNotification = (payload) => {
        console.log('Received notification for user:', user.username, 'Payload:', payload);
        
        // Verify notification is for current user
        if (payload.userId && payload.userId !== user._id) {
          console.log('Ignoring notification for different user:', payload.userId, 'Current user:', user._id);
          return;
        }
        
        dispatch(addNotification({
          id: payload.id || Date.now(),
          type: payload.type || 'system',
          message: payload.message,
          timestamp: payload.timestamp || new Date().toISOString(),
          read: false,
        }));
      };

      const onConnect = () => {
        console.log('Socket connected successfully for user:', user.username);
      };

      const onConnectError = (err) => {
        console.warn('WS connect_error for user:', user.username, err?.message);
      };

      const onReconnect = () => {
        console.log('WS reconnected for user:', user.username);
      };

      s.on('connect', onConnect);
      s.on('notification', onNotification);
      s.on('connect_error', onConnectError);
      s.on('reconnect', onReconnect);

      // Store cleanup function
      socketCleanup = () => {
        console.log('Cleaning up socket event listeners for user:', user.username);
        s.off('connect', onConnect);
        s.off('notification', onNotification);
        s.off('connect_error', onConnectError);
        s.off('reconnect', onReconnect);
      };
    }, 100);

    return () => {
      clearTimeout(timer);
      if (socketCleanup) {
        socketCleanup();
      }
    };
  }, [user, dispatch]);

  return children;
};

export default AuthProvider;