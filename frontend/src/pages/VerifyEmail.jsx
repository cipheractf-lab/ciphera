import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, KeyRound, MailCheck } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { Button, Input, Alert } from '../components/ui';
import './Auth.css';

const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmail() {
  const { verifyOtp, resendOtp } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Arrives here from registration, or from a login rejected with
  // EMAIL_NOT_VERIFIED, or typed directly (then the address is asked for).
  const [email, setEmail] = useState(location.state?.email || '');
  const emailWasProvided = Boolean(location.state?.email);
  const emailSent = location.state?.emailSent !== false;

  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    timerRef.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const onOtpChange = (e) => {
    // Digits only, max 6 -- matches what the backend will accept.
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
    setFormError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setFormError('Please enter the email address you signed up with');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setFormError('Enter the 6-digit code from your email');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await verifyOtp({ email, otp });
      navigate('/');
    } catch (err) {
      setFormError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email) {
      setFormError('Please enter your email address first');
      return;
    }
    setFormError('');
    setNotice('');
    try {
      const data = await resendOtp(email);
      setNotice(data?.message || 'A new code is on its way.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not resend the code. Please try again.');
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
            <MailCheck size={48} />
          </div>
          <h1 className="htb-auth-brand-title">
            Verify your<br />
            <span className="htb-gradient-text">Email</span>
          </h1>
          <p className="htb-auth-brand-subtitle">
            We sent a 6-digit code{emailWasProvided ? ` to ${email}` : ''}. It expires in 10 minutes.
          </p>
        </motion.div>

        <motion.div
          className="htb-auth-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="htb-auth-card-header">
            <h2>Enter Code</h2>
            <p>Check your inbox for the verification code</p>
          </div>

          {!emailSent && (
            <div style={{ marginBottom: '24px' }}>
              <Alert type="warning">
                We couldn&apos;t send the email just now. Try &quot;Resend code&quot; below, or contact an
                administrator if it keeps failing.
              </Alert>
            </div>
          )}

          {formError && (
            <div style={{ marginBottom: '24px' }}>
              <Alert type="warning">{formError}</Alert>
            </div>
          )}

          {notice && (
            <div style={{ marginBottom: '24px' }}>
              <Alert type="info">{notice}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="htb-auth-form">
            {!emailWasProvided && (
              <Input
                type="email"
                name="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                icon={<Mail size={18} />}
                required
                fullWidth
              />
            )}

            <Input
              type="text"
              name="otp"
              label="Verification Code"
              value={otp}
              onChange={onOtpChange}
              placeholder="000000"
              icon={<KeyRound size={18} />}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              fullWidth
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
              {isSubmitting ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>

          <div className="htb-auth-footer">
            <p className="htb-auth-footer-text">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <button
                type="button"
                className="htb-auth-link htb-auth-link-button"
                onClick={onResend}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `resend in ${cooldown}s` : 'resend code'}
              </button>
            </p>
            <p className="htb-auth-footer-text">
              <Link to="/login" className="htb-auth-link">Back to Sign In</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default VerifyEmail;
