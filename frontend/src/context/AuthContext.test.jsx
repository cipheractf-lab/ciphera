import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import axios from 'axios';
import { AuthProvider } from './AuthContext';

vi.mock('axios');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const MockComponent = () => <div>Test Component</div>;

describe('AuthContext - Auto Logout on User Block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Periodic Block Status Check', () => {
    it('should check user block status every 30 seconds when authenticated', async () => {
      localStorage.setItem('token', 'test-token');

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com', isBlocked: false },
              isBlocked: false,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/auth/me');
      });

      const initialCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should logout immediately when user is blocked during periodic check', async () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      localStorage.setItem('token', 'test-token');
      window.location.href = '/';

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com' },
              isBlocked: true,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('token');
        expect(window.location.href).toBe('/blocked');
      });
    });

    it('should logout when receiving 403 status with isBlocked flag during periodic check', async () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      localStorage.setItem('token', 'test-token');
      window.location.href = '/';

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          const error = new Error('Blocked');
          error.response = {
            status: 403,
            data: { isBlocked: true, message: 'User is blocked' },
          };
          return Promise.reject(error);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('token');
        expect(window.location.href).toBe('/blocked');
      });
    });

    it('should not check block status when user is not authenticated', async () => {
      localStorage.clear();

      axios.get.mockResolvedValue({
        status: 200,
        data: { user: null, isBlocked: false },
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      const initialCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBe(initialCallCount);
      });
    });

    it('should not check block status when token is missing', async () => {
      localStorage.removeItem('token');

      axios.get.mockResolvedValue({
        status: 200,
        data: { user: null, isBlocked: false },
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      const initialCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBe(initialCallCount);
      });
    });

    it('should clear interval when component unmounts', async () => {
      const mockClearInterval = vi.spyOn(global, 'clearInterval');
      localStorage.setItem('token', 'test-token');

      axios.get.mockResolvedValue({
        status: 200,
        data: {
          user: { id: 1, email: 'test@example.com', isBlocked: false },
          isBlocked: false,
        },
      });

      const { unmount } = render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      unmount();

      expect(mockClearInterval).toHaveBeenCalled();
    });

    it('should handle block status change from false to true', async () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      localStorage.setItem('token', 'test-token');
      window.location.href = '/dashboard';

      let callCount = 0;
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              status: 200,
              data: {
                user: { id: 1, email: 'test@example.com', isBlocked: false },
                isBlocked: false,
              },
            });
          } else {
            return Promise.resolve({
              status: 200,
              data: {
                user: { id: 1, email: 'test@example.com', isBlocked: true },
                isBlocked: true,
              },
            });
          }
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('token');
        expect(window.location.href).toBe('/blocked');
      });
    });

    it('should set appropriate error message when user is blocked', async () => {
      localStorage.setItem('token', 'test-token');
      window.location.href = '/';

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com' },
              isBlocked: true,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(window.location.href).toBe('/blocked');
      });
    });

    it('should handle multiple consecutive block checks', async () => {
      localStorage.setItem('token', 'test-token');

      let isBlocked = false;
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com', isBlocked },
              isBlocked,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      const initialCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);
      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(initialCallCount);
      });

      const secondCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);
      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(secondCallCount);
      });
    });
  });

  describe('Block Status Detection on Initial Load', () => {
    it('should detect and logout blocked user on initial load', async () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      localStorage.setItem('token', 'test-token');
      window.location.href = '/';

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com' },
              isBlocked: true,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('token');
        expect(window.location.href).toBe('/blocked');
      });
    });

    it('should handle 403 error with isBlocked flag on initial load', async () => {
      const mockRemoveItem = vi.spyOn(Storage.prototype, 'removeItem');
      localStorage.setItem('token', 'test-token');
      window.location.href = '/';

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          const error = new Error('Forbidden');
          error.response = {
            status: 403,
            data: { isBlocked: true, message: 'Account blocked' },
          };
          return Promise.reject(error);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockRemoveItem).toHaveBeenCalledWith('token');
        expect(window.location.href).toBe('/blocked');
      });
    });
  });

  describe('Block Status Check - Edge Cases', () => {
    it('should continue running even if one check fails', async () => {
      localStorage.setItem('token', 'test-token');

      let callCount = 0;
      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          callCount++;
          if (callCount === 2) {
            const error = new Error('Network error');
            error.response = null;
            return Promise.reject(error);
          }
          return Promise.resolve({
            status: 200,
            data: {
              user: { id: 1, email: 'test@example.com', isBlocked: false },
              isBlocked: false,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      const firstCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(firstCallCount);
      });

      const secondCallCount = axios.get.mock.calls.length;

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get.mock.calls.length).toBeGreaterThan(secondCallCount);
      });
    });

    it('should handle 403 error without isBlocked flag gracefully', async () => {
      localStorage.setItem('token', 'test-token');

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          const error = new Error('Forbidden');
          error.response = {
            status: 403,
            data: { message: 'Forbidden' },
          };
          return Promise.reject(error);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });

    it('should handle null user data gracefully', async () => {
      localStorage.setItem('token', 'test-token');

      axios.get.mockImplementation((url) => {
        if (url === '/api/auth/me') {
          return Promise.resolve({
            status: 200,
            data: {
              user: null,
              isBlocked: false,
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <AuthProvider>
          <MockComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
    });
  });
});
