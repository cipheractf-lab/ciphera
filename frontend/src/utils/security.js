// Frontend security utilities

// XSS protection - sanitize user input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate username format
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
};

// Validate password strength
export const validatePassword = (password) => {
  if (password.length < 8) return false;
  if (!/(?=.*[a-z])/.test(password)) return false;
  if (!/(?=.*[A-Z])/.test(password)) return false;
  if (!/(?=.*\d)/.test(password)) return false;
  return true;
};

// Validate flag format
export const validateFlag = (flag) => {
  const flagRegex = /^CTF\{[A-Za-z0-9_\-\+\*\/\=\!\@\#\$\%\^\&\(\)\[\]\{\}\:\;\,\.\?\s]+\}$/;
  return flagRegex.test(flag);
};

// Rate limiting for frontend requests
class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  isAllowed(key, maxRequests = 10, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Secure local storage wrapper
export const secureStorage = {
  set: (key, value) => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  },
  
  get: (key) => {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  },
  
  remove: (key) => {
    localStorage.removeItem(key);
  }
};

// Content Security Policy helper
export const enforceCSP = () => {
  // Disable eval and inline scripts
  if (typeof window !== 'undefined') {
    window.eval = () => {
      throw new Error('eval() is disabled for security reasons');
    };
  }
};

// Initialize security measures
export const initSecurity = () => {
  enforceCSP();
  
  // Allow right-click and text selection for better user experience
  // Removed restrictions to enable copying and right-click functionality
};