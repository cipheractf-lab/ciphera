import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import Login from './Login';
import * as securityUtils from '../utils/security';

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const renderWithContext = (contextValue = {}) => {
  const defaultContextValue = {
    login: vi.fn().mockResolvedValue({ success: true }),
    clearErrors: vi.fn(),
    error: null
  };

  return render(
    <BrowserRouter>
      <AuthContext.Provider value={{ ...defaultContextValue, ...contextValue }}>
        <Login />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Login credential handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();

    vi.spyOn(securityUtils, 'sanitizeInput').mockImplementation((input) => input.trim());
    vi.spyOn(securityUtils, 'validateEmail').mockImplementation((email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    });
  });

  it('sanitizes email but preserves the raw password value', async () => {
    const login = vi.fn().mockResolvedValue({ success: true });
    renderWithContext({ login });

    const emailInput = screen.getByPlaceholderText('user@domain.com');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const rawPassword = 'User@123/ok';

    fireEvent.change(emailInput, {
      target: { name: 'email', value: ' user1@gmail.com ' }
    });
    fireEvent.change(passwordInput, {
      target: { name: 'password', value: rawPassword }
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'user1@gmail.com',
        password: rawPassword
      });
    });

    expect(passwordInput.value).toBe(rawPassword);
    expect(securityUtils.sanitizeInput).toHaveBeenCalled();
    expect(securityUtils.sanitizeInput).not.toHaveBeenCalledWith(rawPassword);
  });

  it('does not trim password whitespace before submit', async () => {
    const login = vi.fn().mockResolvedValue({ success: true });
    renderWithContext({ login });

    const emailInput = screen.getByPlaceholderText('user@domain.com');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    const rawPassword = '  pass with spaces  ';

    fireEvent.change(emailInput, {
      target: { name: 'email', value: 'user1@gmail.com' }
    });
    fireEvent.change(passwordInput, {
      target: { name: 'password', value: rawPassword }
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'user1@gmail.com',
        password: rawPassword
      });
    });
  });
});