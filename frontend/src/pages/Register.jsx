import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Lock, UserPlus, ShieldOff } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import { sanitizeInput, validateEmail } from '../utils/security';
import { Button, Input, Alert, Loading } from '../components/ui';
import './Auth.css';

function Register() {
  const { register, getRegistrationStatus } = useContext(AuthContext);
  const { eventName } = useSiteConfig();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ loading: true, open: false, domain: '' });

  const { username, email, password, confirmPassword } = formData;

  useEffect(() => {
    let cancelled = false;
    getRegistrationStatus()
      .then((data) => {
        if (!cancelled) {
          setStatus({
            loading: false,
            open: data?.registrationOpen === true,
            domain: data?.allowedEmailDomain || ''
          });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ loading: false, open: false, domain: '' });
      });
    return () => { cancelled = true; };
  }, [getRegistrationStatus]);

  const onChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'email' || name === 'username' ? sanitizeInput(value) : value;
    setFormData((prev) => ({ ...prev, [name]: nextValue }));
    setFormError('');
    setFieldError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!username || !email || !password) {
      setFormError('Please fill in every field');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setFormError('Username can only contain letters, numbers, underscores and hyphens');
      setFieldError('username');
      return;
    }
    if (username.length < 3) {
      setFormError('Username must be at least 3 characters long');
      setFieldError('username');
      return;
    }
    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }
    if (status.domain && !email.toLowerCase().endsWith(`@${status.domain}`)) {
      setFormError(`Registration is restricted to @${status.domain} email addresses`);
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const data = await register({ username, email, password });

      if (data?.requiresVerification) {
        navigate('/verify-email', {
          state: { email: data.email || email, emailSent: data.emailSent !== false }
        });
      } else {
        // EMAIL_REQUIRED=false: the account is already usable.
        navigate('/login', { state: { justRegistered: true } });
      }
    } catch (err) {
      const res = err.response?.data;
      if (res?.registrationDisabled) {
        setStatus({ loading: false, open: false });
      } else {
        setFieldError(res?.field || '');
        setFormError(res?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const brand = (
    <motion.div
      className="htb-auth-brand"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="htb-auth-brand-icon">
        <UserPlus size={48} />
      </div>
      <h1 className="htb-auth-brand-title">
        Join<br />
        <span className="htb-gradient-text">{eventName || 'Ciphera'}</span>
      </h1>
      <p className="htb-auth-brand-subtitle">
        Create an account to solve challenges, form a team and climb the leaderboard.
      </p>
    </motion.div>
  );

  return (
    <div className="htb-auth-container">
      <div className="htb-auth-grid-bg"></div>

      <div className="htb-auth-content">
        {brand}

        <motion.div
          className="htb-auth-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {status.loading ? (
            <Loading />
          ) : !status.open ? (
            <>
              <div className="htb-auth-card-header">
                <h2>Registration Closed</h2>
                <p>Public sign-up is not currently open</p>
              </div>

              <div className="htb-auth-notice">
                <ShieldOff size={22} />
                <p>
                  New accounts are being created by administrators at the moment.
                  Contact an admin if you need access.
                </p>
              </div>

              <div className="htb-auth-footer">
                <p className="htb-auth-footer-text">
                  Already have an account? <Link to="/login" className="htb-auth-link">Sign In</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="htb-auth-card-header">
                <h2>Create Account</h2>
                <p>It only takes a moment</p>
              </div>

              {formError && (
                <div style={{ marginBottom: '24px' }}>
                  <Alert type="warning">{formError}</Alert>
                </div>
              )}

              <form onSubmit={onSubmit} className="htb-auth-form">
                <Input
                  type="text"
                  name="username"
                  label="Username"
                  value={username}
                  onChange={onChange}
                  placeholder="your_handle"
                  icon={<User size={18} />}
                  error={fieldError === 'username' ? formError : ''}
                  required
                  fullWidth
                />

                <Input
                  type="email"
                  name="email"
                  label="Email"
                  value={email}
                  onChange={onChange}
                  placeholder={status.domain ? `you@${status.domain}` : 'user@domain.com'}
                  icon={<Mail size={18} />}
                  hint={status.domain ? `Only @${status.domain} addresses can register` : undefined}
                  required
                  fullWidth
                />

                <Input
                  type="password"
                  name="password"
                  label="Password"
                  value={password}
                  onChange={onChange}
                  placeholder="At least 6 characters"
                  icon={<Lock size={18} />}
                  required
                  fullWidth
                />

                <Input
                  type="password"
                  name="confirmPassword"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={onChange}
                  placeholder="Repeat your password"
                  icon={<Lock size={18} />}
                  required
                  fullWidth
                />

                <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="htb-auth-footer">
                <p className="htb-auth-footer-text">
                  Already have an account? <Link to="/login" className="htb-auth-link">Sign In</Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
