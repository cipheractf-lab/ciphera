import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();


const getApiUrl = () => {
  // Always use relative path for this deployment structure (Frontend + Backend on same server)
  // This eliminates configuration errors and CORS issues
  return '';
};

// Configure axios defaults
axios.defaults.baseURL = getApiUrl();

axios.defaults.withCredentials = true;  // Enable credentials
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Enhanced axios interceptors for refresh token handling
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

axios.interceptors.response.use(
  response => {
    // Cookies are handled automatically - no manual token refresh needed
    return response;
  },
  async error => {
    const originalRequest = error.config;

    // Only log unexpected errors (not auth failures for unauthenticated users)
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/me') || 
                           originalRequest?.url?.includes('/api/auth/refresh');
    const is401 = error.response?.status === 401;
    
    // Don't log expected 401s on auth endpoints (user not logged in)
    if (!(isAuthEndpoint && is401)) {
      console.error('API Error:', error);
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network connection failed');
      const networkError = new Error('Network connection failed. Please check your internet connection.');
      networkError.isNetworkError = true;
      return Promise.reject(networkError);
    }

    // Handle 401 errors with refresh token logic
    // Skip refresh logic for login/register endpoints (they should fail immediately)
    const isLoginEndpoint = originalRequest?.url?.includes('/api/auth/login') || 
                           originalRequest?.url?.includes('/api/auth/register');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginEndpoint) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the access token
        await axios.post('/api/auth/refresh');
        
        // Token refreshed successfully - process queued requests
        processQueue(null);
        isRefreshing = false;
        
        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear queue and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;

        const currentPath = window.location.pathname;
        // Cookie cleared automatically by browser

        // Only redirect if not already on login page
        if (currentPath !== '/login' && currentPath !== '/register') {
          console.log('Token refresh failed, redirecting to login');
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    // Handle rate limit errors with better user feedback
    if (error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'] ||
        error.response.data?.retryAfter || 60;
      const message = error.response.data?.error || 'Slow down!';

      console.error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
      return Promise.reject({
        message: message,
        status: 429,
        retryAfter: retryAfter,
        type: 'rate_limit'
      });
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      return Promise.reject({
        message: 'Server error. Please try again later.',
        status: error.response.status,
        type: 'server_error'
      });
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Logout user - defined early for use in useEffect dependencies
  const logout = useCallback(async () => {
    try {
      // Call backend to clear httpOnly cookie
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Load user on mount (cookie-based authentication)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');

        // Check if user is blocked
        if (res.status === 403 || res.data.isBlocked) {
          console.warn('User is blocked');
          setUser(null);
          setIsAuthenticated(false);
          setError('Your account has been blocked.');
          window.location.href = '/blocked';
          setLoading(false);
          return;
        }

        setUser(res.data.user);
        setIsAuthenticated(true);
      } catch (err) {
        console.error('Auth error:', err);

        // Check if error is due to user being blocked
        if (err.response?.status === 403 && err.response?.data?.isBlocked) {
          console.warn('User is blocked (from error)');
          setUser(null);
          setIsAuthenticated(false);
          setError('Your account has been blocked.');
          window.location.href = '/blocked';
          setLoading(false);
          return;
        }

        // Not authenticated - cookie invalid or absent
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Always set loading to false
        setLoading(false);
      }
    };

    // Set a timeout to ensure loading doesn't hang indefinitely
    const timeoutId = setTimeout(() => {
      if (loading) {
        // Silently set loading to false after timeout
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    loadUser();

    return () => clearTimeout(timeoutId);
  }, []);

  // Periodic check for user block status (every 5 minutes to reduce load)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const blockCheckInterval = setInterval(async () => {
      try {
        const res = await axios.get('/api/auth/me');

        // If user is blocked, logout immediately
        if (res.data.isBlocked) {
          console.warn('User has been blocked - logging out');
          logout();
          setError('Your account has been blocked by an administrator.');
          window.location.href = '/blocked';
        }
      } catch (err) {
        // Only logout for block-related errors (403 with isBlocked)
        // Ignore 401 errors as they're handled by axios interceptor
        if (err.response?.status === 403 && err.response?.data?.isBlocked) {
          console.warn('User has been blocked - logging out');
          logout();
          setError('Your account has been blocked by an administrator.');
          window.location.href = '/blocked';
        }
        // For other errors (like 401), silently continue - axios interceptor will handle
      }
    }, 300000); // Check every 5 minutes (reduced from 60 seconds)

    return () => clearInterval(blockCheckInterval);
  }, [isAuthenticated, user, logout]);

  // Update user data (points, solved challenges, etc.)
  const updateUserData = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.user);
    } catch (err) {
      console.error('Error updating user data:', err);
    }
  }, []);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post('/api/auth/register', userData);

      // Cookie is set automatically by backend
      setUser(res.data.user);
      setIsAuthenticated(true);
      setLoading(false);

      return res.data;
    } catch (err) {
      console.error('Registration error:', err);
      setLoading(false);

      // Handle rate limit errors specifically
      if (err.status === 429) {
        setError(`Registration rate limit exceeded. Please try again in ${err.retryAfter} seconds.`);
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }

      throw err;
    }
  };

  // Login user
  const login = async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.post('/api/auth/login', userData);

      // Cookie is set automatically by backend
      setUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data;
    } catch (err) {
      console.error('Login error:', err);
      
      // Handle rate limiting (429) and lockout - always show backend message
      if (err.response && err.response.status === 429) {
        const message = err.response.data?.error || err.response.data?.message || 'Too many attempts.';
        setError(message);
        throw new Error(message);
      }

      // Handle blocked user (403) - Check before network errors
      if (err.response?.status === 403 && err.response?.data?.isBlocked) {
        const errorMsg = err.response?.data?.message || 'Your account has been blocked. Contact Admin for further information.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Handle invalid credentials (401) - Check before network errors
      if (err.response?.status === 401) {
        const errorMsg = err.response?.data?.message || 'Invalid credentials. Please check your email and password.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Handle network errors - only if there is truly no response
      // But if status is 429, treat as rate limit
      if (!err.response || err.isNetworkError) {
        if (err.status === 429 || err.code === 429) {
          const message = 'Too many attempts.';
          setError(message);
          throw new Error(message);
        }
        const errorMsg = 'Network connection failed. Please check your internet connection and try again.';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Handle other errors
      const errorMsg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Clear errors
  const clearErrors = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        updateUserData,
        register,
        login,
        logout,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
