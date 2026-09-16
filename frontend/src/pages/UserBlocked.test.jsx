import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import UserBlocked from './UserBlocked';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithContext = (contextValue) => {
  const defaultContextValue = {
    logout: vi.fn(),
  };

  const value = { ...defaultContextValue, ...contextValue };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={value}>
        <UserBlocked />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('UserBlocked Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Auto Logout on Block', () => {
    it('should render blocked account message', () => {
      renderWithContext();

      expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      expect(screen.getByText(/Suspicious activity detected/)).toBeInTheDocument();
    });

    it('should render lock icon for blocked status', () => {
      renderWithContext();

      expect(screen.getByText('🔒')).toBeInTheDocument();
    });

    it('should automatically logout after 30 seconds', async () => {
      const mockLogout = vi.fn();
      renderWithContext({ logout: mockLogout });

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('should logout and navigate to login when logout button clicked', async () => {
      const mockLogout = vi.fn();
      renderWithContext({ logout: mockLogout });

      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should display auto logout message', () => {
      renderWithContext();

      expect(screen.getByText(/You will be automatically logged out in 30 seconds/)).toBeInTheDocument();
    });

    it('should display contact admin message', () => {
      renderWithContext();

      expect(screen.getByText(/Please contact the administrator/)).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('should render all required UI elements', () => {
      renderWithContext();

      expect(screen.getByText('Account Blocked')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument();
    });

    it('should have correct CSS classes applied', () => {
      renderWithContext();

      const blockedContainer = screen.getByText('Account Blocked').closest('.blocked-container');
      expect(blockedContainer).toHaveClass('blocked-container');

      const blockedCard = screen.getByText('Account Blocked').closest('.blocked-card');
      expect(blockedCard).toHaveClass('blocked-card');
    });

    it('should render logout button with correct class', () => {
      renderWithContext();

      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      expect(logoutButton).toHaveClass('logout-btn');
    });
  });

  describe('Cleanup and Unmount', () => {
    it('should clear timeout when component unmounts', async () => {
      const mockLogout = vi.fn();
      const { unmount } = renderWithContext({ logout: mockLogout });

      unmount();

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockLogout).not.toHaveBeenCalled();
      });
    });

    it('should not logout after manual logout button click and auto logout', async () => {
      const mockLogout = vi.fn();
      renderWithContext({ logout: mockLogout });

      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Multiple Renders', () => {
    it('should handle multiple component mounts correctly', async () => {
      const mockLogout = vi.fn();
      const { unmount } = renderWithContext({ logout: mockLogout });

      vi.advanceTimersByTime(15000);

      unmount();

      const mockLogout2 = vi.fn();
      const { unmount: unmount2 } = renderWithContext({ logout: mockLogout2 });

      vi.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(mockLogout2).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });

      unmount2();
    });
  });

  describe('Error States', () => {
    it('should handle logout function errors gracefully', async () => {
      const mockLogout = vi.fn().mockImplementation(() => {
        throw new Error('Logout failed');
      });

      renderWithContext({ logout: mockLogout });

      const logoutButton = screen.getByRole('button', { name: 'Logout' });

      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });

    it('should handle navigate function errors gracefully', async () => {
      const mockLogout = vi.fn();
      const mockNavigateError = vi.fn().mockImplementation(() => {
        throw new Error('Navigation failed');
      });

      vi.mock('react-router-dom', async () => {
        const actual = await vi.importActual('react-router-dom');
        return {
          ...actual,
          useNavigate: () => mockNavigateError,
        };
      });

      renderWithContext({ logout: mockLogout });

      const logoutButton = screen.getByRole('button', { name: 'Logout' });

      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Message Content Verification', () => {
    it('should display blocked message content', () => {
      renderWithContext();

      expect(screen.getByText('You are blocked. Suspicious activity detected.')).toBeInTheDocument();
    });

    it('should display additional blocked explanation', () => {
      renderWithContext();

      expect(
        screen.getByText(/Your account has been temporarily blocked due to suspicious activity or policy violation/)
      ).toBeInTheDocument();
    });

    it('should display admin contact instruction', () => {
      renderWithContext();

      expect(screen.getByText(/Please contact the administrator for further information and assistance/)).toBeInTheDocument();
    });
  });
});
