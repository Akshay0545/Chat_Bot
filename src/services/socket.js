import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
console.log('Socket connecting to:', WS_URL);

let socket;

export function getSocket() {
  if (socket) return socket;
  const token = localStorage.getItem('token');
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    console.log('Connecting socket...');
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function refreshAuthToken(token) {
  const s = getSocket();
  s.auth = { token };
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
}


