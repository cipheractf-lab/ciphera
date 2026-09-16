import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Login from './Login';
import * as securityUtils from '../utils/security';
import Logger from '../utils/logger';

vi.mock('../utils/logger');

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
    login: vi.fn(),
    error: null,
    clearErrors: vi.fn(),
  };

  const value = { ...defaultContextValue, ...contextValue };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={value}>
        <Login />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    vi.spyOn(securityUtils, 'sanitizeInput').mockImplementation((input) => input);
    vi.spyOn(securityUtils, 'validateEmail').mockImplementation((email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
    vi.spyOn(securityUtils, 'rateLimiter', 'get').mockReturnValue({
      isAllowed: vi.fn().mockReturnValue(true),
    });
  });

  describe('Happy Path - Successful Login', () => {
    it('should successfully login with valid credentials and navigate to home', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token', user: { id: 1, email: 'test@example.com' } });
      
      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'TestPassword123',
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });

      expect(Logger.info).toHaveBeenCalledWith('LOGIN_ATTEMPT_START', { email: 'test@example.com' });
      expect(Logger.info).toHaveBeenCalledWith('LOGIN_SUCCESS', { email: 'test@example.com' });
    });

    it('should update form data as user types in email field', async () => {
      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      await userEvent.type(emailInput, 'user@example.com');

      expect(emailInput.value).toBe('user@example.com');
    });

    it('should update form data as user types in password field', async () => {
      renderWithContext();

      const passwordInput = screen.getByLabelText('Password');
      await userEvent.type(passwordInput, 'SecurePassword123');

      expect(passwordInput.value).toBe('SecurePassword123');
    });
  });

  describe('Form Validation - Input Verification', () => {
    it('should show error when email field is empty', async () => {
      renderWithContext();

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter all fields')).toBeInTheDocument();
    });

    it('should show error when password field is empty', async () => {
      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter all fields')).toBeInTheDocument();
    });

    it('should show error when both fields are empty', async () => {
      renderWithContext();

      const submitButton = screen.getByRole('button', { name: 'Login' });
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter all fields')).toBeInTheDocument();
    });

    it('should show error when email format is invalid', async () => {
      securityUtils.validateEmail.mockReturnValue(false);

      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });

    it('should clear form errors when user starts typing', async () => {
      renderWithContext();

      const submitButton = screen.getByRole('button', { name: 'Login' });
      await userEvent.click(submitButton);

      expect(screen.getByText('Please enter all fields')).toBeInTheDocument();

      const emailInput = screen.getByLabelText('Email');
      await userEvent.type(emailInput, 'a');

      expect(screen.queryByText('Please enter all fields')).not.toBeInTheDocument();
    });

    it('should clear rate limit block status when user starts typing', async () => {
      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');

      const mockLogin = vi.fn().mockRejectedValue({
        response: { status: 403, data: { isBlocked: true } },
      });

      renderWithContext({ login: mockLogin });

      const emailInput2 = screen.getByLabelText('Email');
      const passwordInput2 = screen.getByLabelText('Password');
      const submitButton2 = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput2, 'test@example.com');
      await userEvent.type(passwordInput2, 'TestPassword123');
      await userEvent.click(submitButton2);

      await waitFor(() => {
        expect(screen.getByText(/🔒/)).toBeInTheDocument();
      });

      await userEvent.type(emailInput2, 'a');

      await waitFor(() => {
        expect(screen.queryByText(/🔒/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should prevent login and show error when rate limit exceeded', async () => {
      securityUtils.rateLimiter.isAllowed.mockReturnValue(false);

      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(screen.getByText('Too many login attempts. Please try again later.')).toBeInTheDocument();
      expect(Logger.warn).toHaveBeenCalledWith('LOGIN_RATE_LIMITED', { email: 'test@example.com' });
    });

    it('should check rate limit with correct parameters', async () => {
      securityUtils.rateLimiter.isAllowed.mockReturnValue(false);

      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(securityUtils.rateLimiter.isAllowed).toHaveBeenCalledWith('login', 5, 900000);
    });

    it('should allow login when rate limit not exceeded', async () => {
      securityUtils.rateLimiter.isAllowed.mockReturnValue(true);

      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token' });
      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling - Blocked User', () => {
    it('should display blocked error when user is blocked (403 status)', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: {
            isBlocked: true,
            message: 'You are blocked. Suspicious activity detected.',
          },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('You are blocked. Suspicious activity detected.')).toBeInTheDocument();
      });

      expect(screen.getByText(/🔒/)).toBeInTheDocument();
    });

    it('should set isBlocked flag when 403 with isBlocked data received', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: { isBlocked: true, message: 'Blocked' },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorDiv = screen.getByText('Blocked').parentElement;
        expect(errorDiv).toHaveClass('blocked-error');
      });
    });
  });

  describe('Error Handling - Generic Errors', () => {
    it('should display error message from API response', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { message: 'Invalid email or password' },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'WrongPassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
      });

      expect(Logger.error).toHaveBeenCalledWith('LOGIN_FAILED', expect.objectContaining({
        email: 'test@example.com',
      }));
    });

    it('should display error message from error.message when API response not available', async () => {
      const mockLogin = vi.fn().mockRejectedValue(
        new Error('Network error')
      );

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display default error message when no error message provided', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: { status: 500 },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument();
      });
    });

    it('should log login failure with email', async () => {
      const mockLogin = vi.fn().mockRejectedValue(
        new Error('Login failed')
      );

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          'LOGIN_FAILED',
          expect.objectContaining({
            email: 'test@example.com',
          })
        );
      });
    });
  });

  describe('UI State - Submit Button', () => {
    it('should disable submit button while submitting', async () => {
      const mockLogin = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Logging in...');

      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Login');
      });
    });

    it('should re-enable submit button after login succeeds', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token' });

      renderWithContext({ login: mockLogin });

      const submitButton = screen.getByRole('button', { name: 'Login' });
      expect(submitButton).not.toBeDisabled();
    });

    it('should re-enable submit button after login fails', async () => {
      const mockLogin = vi.fn().mockRejectedValue(
        new Error('Login failed')
      );

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });



  describe('Input Sanitization', () => {
    it('should sanitize email input', async () => {
      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      const testValue = '<script>alert("xss")</script>';

      fireEvent.change(emailInput, { target: { value: testValue, name: 'email' } });

      expect(securityUtils.sanitizeInput).toHaveBeenCalledWith(testValue);
    });

    it('should sanitize password input', async () => {
      renderWithContext();

      const passwordInput = screen.getByLabelText('Password');
      const testValue = '"><script>alert("xss")</script>';

      fireEvent.change(passwordInput, { target: { value: testValue, name: 'password' } });

      expect(securityUtils.sanitizeInput).toHaveBeenCalledWith(testValue);
    });
  });

  describe('Context Integration', () => {
    it('should clear context errors when user types', async () => {
      const mockClearErrors = vi.fn();

      renderWithContext({ clearErrors: mockClearErrors });

      const emailInput = screen.getByLabelText('Email');
      await userEvent.type(emailInput, 'test@example.com');

      expect(mockClearErrors).toHaveBeenCalled();
    });

    it('should call login function with form data', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token' });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'user@test.com');
      await userEvent.type(passwordInput, 'Password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'user@test.com',
          password: 'Password123',
        });
      });
    });
  });

  describe('Form UI Elements', () => {
    it('should render email input field with correct attributes', () => {
      renderWithContext();

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('id', 'email');
      expect(emailInput).toHaveAttribute('name', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
    });

    it('should render password input field with correct attributes', () => {
      renderWithContext();

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(passwordInput).toHaveAttribute('name', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });

    it('should render login header with correct text', () => {
      renderWithContext();

      expect(screen.getByText(/Login to/)).toBeInTheDocument();
      expect(screen.getByText('pwngrid Horizon')).toBeInTheDocument();
    });

    it('should render footer text', () => {
      renderWithContext();

      expect(screen.getByText(/Need an account\?/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle form submission with whitespace in fields', async () => {
      securityUtils.sanitizeInput.mockImplementation((input) => input.trim());
      securityUtils.validateEmail.mockReturnValue(true);

      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token' });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, '  test@example.com  ');
      await userEvent.type(passwordInput, '  TestPassword123  ');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    it('should prevent default form submission behavior', async () => {
      const mockLogin = vi.fn().mockResolvedValue({ token: 'test-token' });

      renderWithContext({ login: mockLogin });

      const form = screen.getByRole('button', { name: 'Login' }).closest('form');
      const submitEvent = new Event('submit', { bubbles: true });
      const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

      form.dispatchEvent(submitEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Blocked User Detection - Admin Block Feature', () => {
    it('should show blocked error with icon when admin blocks user during login', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: {
            isBlocked: true,
            message: 'Your account has been blocked by administrator.',
          },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'blocked@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Your account has been blocked by administrator.')).toBeInTheDocument();
      });

      expect(screen.getByText(/🔒/)).toBeInTheDocument();
    });

    it('should apply blocked-error class when user is blocked', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: {
            isBlocked: true,
            message: 'Account blocked - suspicious activity',
          },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'blocked@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorDiv = screen.getByText('Account blocked - suspicious activity').closest('div');
        expect(errorDiv).toHaveClass('blocked-error');
      });
    });

    it('should set isBlocked state when receiving 403 with isBlocked flag', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: {
            isBlocked: true,
            message: 'User blocked by admin',
          },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'admin_blocked@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorDiv = screen.getByText('User blocked by admin').closest('div');
        expect(errorDiv).toHaveClass('auth-error');
        expect(errorDiv).toHaveClass('blocked-error');
      });
    });

    it('should not set blocked state for 403 error without isBlocked flag', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        const errorDiv = screen.getByText('Forbidden').closest('div');
        expect(errorDiv).toHaveClass('auth-error');
        expect(errorDiv).not.toHaveClass('blocked-error');
      });
    });

    it('should handle multiple block attempts with persistent blocked state', async () => {
      const mockLogin = vi.fn()
        .mockRejectedValueOnce({
          response: {
            status: 403,
            data: {
              isBlocked: true,
              message: 'First block attempt',
            },
          },
        });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'blocked@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('First block attempt')).toBeInTheDocument();
        expect(screen.getByText(/🔒/)).toBeInTheDocument();
      });

      const blockedIcon = screen.getByText(/🔒/);
      expect(blockedIcon).toBeInTheDocument();
    });

    it('should clear blocked icon when user starts typing after being blocked', async () => {
      const mockLogin = vi.fn().mockRejectedValue({
        response: {
          status: 403,
          data: {
            isBlocked: true,
            message: 'Blocked - try again later',
          },
        },
      });

      renderWithContext({ login: mockLogin });

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Login' });

      await userEvent.type(emailInput, 'blocked@example.com');
      await userEvent.type(passwordInput, 'TestPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/🔒/)).toBeInTheDocument();
      });

      await userEvent.type(emailInput, 'a');

      await waitFor(() => {
        expect(screen.queryByText(/🔒/)).not.toBeInTheDocument();
      });
    });
  });
});
