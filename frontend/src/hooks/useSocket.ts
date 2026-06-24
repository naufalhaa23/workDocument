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

    // Reuse the existing instance (connected OR still connecting).
    // Never tear down a live socket just because a second component mounted —
    // doing so would drop listeners already attached elsewhere (e.g. notification:new in App.tsx).
    if (socketInstance) {
      setSocket(socketInstance);
      return;
    }

    const newSocket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: { token: accessToken },
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance = newSocket;
    // Expose immediately so every consumer attaches listeners to the SAME instance.
    // Socket.io queues handlers registered before 'connect', so this is safe.
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      console.warn('🔌 Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
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
