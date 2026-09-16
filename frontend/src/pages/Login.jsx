import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { sanitizeInput, validateEmail } from '../utils/security';
import Logger from '../utils/logger';
import { Button, Input, Alert } from '../components/ui';
import './Auth.css';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const { login, clearErrors } = useContext(AuthContext);
  const { eventName } = useSiteConfig();
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'email' ? sanitizeInput(value) : value;

    setFormData({ ...formData, [name]: nextValue });
    setFormError('');
    setIsBlocked(false);
    clearErrors();
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      setFormError('Please enter all fields');
      return;
    }

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    Logger.info('LOGIN_ATTEMPT_START', { email });
    setIsSubmitting(true);
    setFormError(''); // Clear previous errors

    try {
      await login({ email, password });
      Logger.info('LOGIN_SUCCESS', { email });
      navigate('/');
    } catch (err) {
      Logger.error('LOGIN_FAILED', { email, error: err.message });
      
      // Set appropriate error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      setFormError(errorMessage);
      
      // Check if user is blocked (403)
      if (err.message?.includes('blocked')) {
        setIsBlocked(true);
      }
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

  return (
    <div className="htb-auth-container htb-auth-container-login">
      <div className="htb-auth-login-blur-bg"></div>
      
      {/* Main Content */}
      <div className="htb-auth-content htb-auth-content-login">
        {/* Left Side - Branding */}
        <motion.div
          className="htb-auth-brand htb-auth-brand-login"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="htb-auth-brand-title htb-auth-brand-title-login">
            Welcome to<br />
            <span className="htb-gradient-text htb-gradient-text-login">{eventName}</span>
          </h1>
          <p className="htb-auth-brand-subtitle htb-auth-brand-subtitle-login">
            Sign in to access challenges and compete with hackers worldwide
          </p>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          className="htb-auth-card htb-auth-card-login"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="htb-auth-card-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to continue</p>
          </div>

          {formError && (
            <div style={{ marginBottom: '24px' }}>
              <Alert type={isBlocked ? "danger" : "warning"}>
                {formError}
              </Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="htb-auth-form">
            <Input
              type="email"
              name="email"
              label="Email"
              value={email}
              onChange={onChange}
              placeholder="user@domain.com"
              icon={<Mail size={18} />}
              required
              fullWidth
            />

            <Input
              type="password"
              name="password"
              label="Password"
              value={password}
              onChange={onChange}
              placeholder="Enter your password"
              icon={<Lock size={18} />}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="htb-auth-footer">
            <p className="htb-auth-footer-text">
              Don't have an account? <Link to="/register" className="htb-auth-link">Contact Admin</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;
