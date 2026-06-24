import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

// Singleton socket instance
let socketInstance: Socket | null = null;

export const getSocket = () => socketInstance;

export function useSocketConnection() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    // Reuse existing connected instance
    if (socketInstance && socketInstance.connected) {
      setSocket(socketInstance);
      return;
    }

    // If instance exists but not connected, disconnect and recreate
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }

    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance = newSocket;

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    newSocket.on('reconnect', () => {
      console.log('🔌 Socket reconnected');
      setSocket(newSocket);
    });

    // Don't disconnect on unmount — keep connection alive across page navigation.
  }, [isAuthenticated, accessToken]);

  return socket;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
