import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  name: string;
  phone: string;
  monthly_income?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.login({ phone, password });
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      set({ user: data.user, isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail || 'Login failed', isLoading: false });
    }
  },

  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authAPI.register(formData);
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      set({ isLoading: false });
    } catch (e: any) {
      set({ error: e.response?.data?.detail || 'Registration failed', isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
