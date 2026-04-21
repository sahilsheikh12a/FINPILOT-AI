import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Expo Go on a physical device, set this to your machine's LAN IP.
// Find it with: ip route get 1.1.1.1 | awk '{print $7}'
const DEV_HOST = '10.197.231.26';

const BASE_URL = __DEV__
  ? `http://${DEV_HOST}:8001/api/v1`
  : 'https://your-api.finpilot.in/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          await AsyncStorage.setItem('access_token', data.access_token);
          await AsyncStorage.setItem('refresh_token', data.refresh_token);
          error.config.headers.Authorization = `Bearer ${data.access_token}`;
          return api.request(error.config);
        } catch {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// Auth
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
};

// Transactions
export const transactionAPI = {
  parseSMS: (sms: string) => api.post('/transactions/parse-sms', { sms_text: sms }),
  parseBatchSMS: (payload: {
    messages: Array<{ sms_text: string; sender?: string; received_at?: string }>;
  }) => api.post('/transactions/parse-sms/batch', payload),
  create: (data: any) => api.post('/transactions/', data),
  list: (params?: any) => api.get('/transactions/', { params }),
  monthlySummary: (month: number, year: number) =>
    api.get('/transactions/summary/monthly', { params: { month, year } }),
};

// Budget
export const budgetAPI = {
  generate: (month: number, year: number) =>
    api.post('/budget/generate', { month, year }),
  create: (data: any) => api.post('/budget/', data),
  getCurrent: () => api.get('/budget/current'),
};

// Goals
export const goalAPI = {
  list: () => api.get('/goals/'),
  create: (data: any) => api.post('/goals/', data),
  update: (id: string, data: any) => api.patch(`/goals/${id}`, data),
};

// EMI
export const emiAPI = {
  add: (data: any) => api.post('/emis/', data),
  stressAnalysis: () => api.get('/emis/stress'),
};

// Subscriptions
export const subscriptionAPI = {
  list: () => api.get('/subscriptions/'),
  add: (data: any) => api.post('/subscriptions/', data),
};

// Chat
export const chatAPI = {
  send: (message: string, session_id?: string) =>
    api.post('/chat/', { message, session_id }),
};

// Alerts
export const alertAPI = {
  list: (unread?: boolean) =>
    api.get('/alerts/', { params: unread ? { unread_only: true } : {} }),
  markRead: (id: string) => api.patch(`/alerts/${id}/read`),
  markAllRead: () => api.patch('/alerts/read-all'),
};
