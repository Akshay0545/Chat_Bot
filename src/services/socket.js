// src/services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_WS_URL || // legacy fallback if you had this
  'http://localhost:5000';

let socket;

export function getSocket() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No authentication token found for socket connection');
    return null;
  }

  if (!socket || socket.disconnected) {
    if (socket) {
      socket.disconnect();
      socket.removeAllListeners();
    }

    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
      auth: { token },                // server expects handshake.auth.token
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      forceNew: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connect_error:', err?.message || err);
    });
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s) return null;
  if (!s.connected) {
    console.log('Connecting socket to', SOCKET_URL);
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
}

export function refreshAuthToken(nextToken) {
  const s = getSocket();
  if (!s) return;
  s.auth = { token: nextToken };
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
}
