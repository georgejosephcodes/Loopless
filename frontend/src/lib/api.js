import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

// Access token lives in memory only. The refresh token is an httpOnly cookie.
let accessToken = null;
let onAuthLost = () => {};

export const setAccessToken = (token) => { accessToken = token; };
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// One refresh at a time: refresh tokens are single use, so concurrent
// callers (StrictMode double-mount, parallel 401s) must share one request.
let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    refreshing = axios
      .post(`${baseURL}/api/auth/refresh`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.accessToken;
        return res.data;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith('/api/auth/');
    if (response?.status !== 401 || !config || config._retry || isAuthCall) throw error;

    config._retry = true;
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      onAuthLost();
      throw error;
    }
    return api(config);
  }
);

export const errorMessage = (err, fallback = 'Something went wrong.') =>
  err?.response?.data?.error || fallback;

export default api;
