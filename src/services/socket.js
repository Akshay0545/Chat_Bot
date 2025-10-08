import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
console.log('Socket connecting to:', WS_URL);

let socket;

export function getSocket() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No authentication token found for socket connection');
    return null;
  }
  
  // Only create new socket if none exists or if disconnected
  if (!socket || !socket.connected) {
    // Clean up existing socket if it exists
    if (socket) {
      console.log('Disconnecting existing socket before creating new one');
      socket.disconnect();
      socket.removeAllListeners();
    }
    
    socket = io(WS_URL, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      forceNew: true, // Force new connection
    });
    
    // Add connection event listeners for debugging
    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket.id, 'Token user:', token.substring(0, 20) + '...');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  } else {
    console.log('Reusing existing socket connection');
  }
  
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s) {
    console.error('Cannot connect socket: No authentication token');
    return null;
  }
  
  if (!s.connected) {
    console.log('Connecting socket...');
    s.connect();
  } else {
    console.log('Socket already connected');
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    console.log('Disconnecting socket and cleaning up...');
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
}

export function refreshAuthToken(token) {
  const s = getSocket();
  s.auth = { token };
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
}


