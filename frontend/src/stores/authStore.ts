import { create } from 'zustand';
import type { User, Role } from '../types';
import { api } from '../lib/axios';
import { disconnectSocket } from '../hooks/useSocket';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  setAuth: (user: User, token: string) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // Start true so we can checkAuth on mount

  setAuth: (user, token) => {
    set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
  },

  checkAuth: async () => {
    try {
      // Trying to hit refresh endpoint to see if we have valid httpOnly cookie
      const { data } = await api.post('/auth/refresh');
      set({ user: data.user, accessToken: data.accessToken, isAuthenticated: true });
    } catch (err) {
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { username, password });
      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err) {
      set({ isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // ignore
    }
    // Close the socket so no further events (e.g. our own logout activity) reach the client
    disconnectSocket();
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  hasRole: (roles: Role[]) => {
    const user = get().user;
    return user !== null && roles.includes(user.role);
  },
}));
