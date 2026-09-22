import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, MailCheck } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { sanitizeInput, validateEmail } from '../utils/security';
import { Button, Input, Alert } from '../components/ui';
import './Auth.css';

function ForgotPassword() {
  const { forgotPassword } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      setFormError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await forgotPassword(email);
      // The backend answers identically whether or not the account exists, so
      // the UI must not imply anything either way.
      setSent(true);
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Could not send the reset link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="htb-auth-container">
      <div className="htb-auth-grid-bg"></div>

      <div className="htb-auth-content">
        <motion.div
          className="htb-auth-brand"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="htb-auth-brand-icon">
            <KeyRound size={48} />
          </div>
          <h1 className="htb-auth-brand-title">
            Forgot your<br />
            <span className="htb-gradient-text">Password?</span>
          </h1>
          <p className="htb-auth-brand-subtitle">
            Enter your email address and we&apos;ll send you a link to choose a new one.
          </p>
        </motion.div>

        <motion.div
          className="htb-auth-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {sent ? (
            <>
              <div className="htb-auth-card-header">
                <h2>Check Your Inbox</h2>
                <p>If an account exists, a reset link is on its way</p>
              </div>

              <div className="htb-auth-notice">
                <MailCheck size={22} />
                <p>
                  The link expires in 10 minutes. If it doesn&apos;t arrive, check your spam folder
                  or try again.
                </p>
              </div>

              <div className="htb-auth-footer">
                <p className="htb-auth-footer-text">
                  <Link to="/login" className="htb-auth-link">Back to Sign In</Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="htb-auth-card-header">
                <h2>Reset Password</h2>
                <p>We&apos;ll email you a reset link</p>
              </div>

              {formError && (
                <div style={{ marginBottom: '24px' }}>
                  <Alert type="warning">{formError}</Alert>
                </div>
              )}

              <form onSubmit={onSubmit} className="htb-auth-form">
                <Input
                  type="email"
                  name="email"
                  label="Email"
                  value={email}
                  onChange={(e) => { setEmail(sanitizeInput(e.target.value)); setFormError(''); }}
                  placeholder="user@domain.com"
                  icon={<Mail size={18} />}
                  required
                  fullWidth
                />

                <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <div className="htb-auth-footer">
                <p className="htb-auth-footer-text">
                  Remembered it? <Link to="/login" className="htb-auth-link">Sign In</Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default ForgotPassword;
