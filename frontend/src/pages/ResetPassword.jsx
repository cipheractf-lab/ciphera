import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, KeyRound, LinkIcon, CheckCircle2 } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { Button, Input, Alert, Loading } from '../components/ui';
import './Auth.css';

function ResetPassword() {
  const { resetPassword, validateResetToken } = useContext(AuthContext);
  const { token } = useParams();
  const navigate = useNavigate();

  // Validate on mount so an expired link says so before the user types a new
  // password twice.
  const [tokenState, setTokenState] = useState({ checking: true, valid: false });
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const { password, confirmPassword } = formData;

  useEffect(() => {
    let cancelled = false;
    validateResetToken(token)
      .then((valid) => { if (!cancelled) setTokenState({ checking: false, valid }); })
      .catch(() => { if (!cancelled) setTokenState({ checking: false, valid: false }); });
    return () => { cancelled = true; };
  }, [token, validateResetToken]);

  const onChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();

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
      await resetPassword({ token, password });
      setDone(true);
      // Every existing session was revoked, so send them through the front
      // door rather than auto-logging in.
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not reset your password. Please try again.');
      if (err.response?.status === 400) {
        setTokenState({ checking: false, valid: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderBody = () => {
    if (tokenState.checking) return <Loading />;

    if (done) {
      return (
        <>
          <div className="htb-auth-card-header">
            <h2>Password Changed</h2>
            <p>All other sessions have been signed out</p>
          </div>
          <div className="htb-auth-notice">
            <CheckCircle2 size={22} />
            <p>Taking you to the sign-in page...</p>
          </div>
          <div className="htb-auth-footer">
            <p className="htb-auth-footer-text">
              <Link to="/login" className="htb-auth-link">Sign In</Link>
            </p>
          </div>
        </>
      );
    }

    if (!tokenState.valid) {
      return (
        <>
          <div className="htb-auth-card-header">
            <h2>Link Expired</h2>
            <p>This reset link is no longer valid</p>
          </div>
          <div className="htb-auth-notice">
            <LinkIcon size={22} />
            <p>
              Reset links expire after 10 minutes and can only be used once.
              Request a fresh one to continue.
            </p>
          </div>
          <div className="htb-auth-footer">
            <p className="htb-auth-footer-text">
              <Link to="/forgot-password" className="htb-auth-link">Request a new link</Link>
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="htb-auth-card-header">
          <h2>Choose a New Password</h2>
          <p>Pick something you haven&apos;t used before</p>
        </div>

        {formError && (
          <div style={{ marginBottom: '24px' }}>
            <Alert type="warning">{formError}</Alert>
          </div>
        )}

        <form onSubmit={onSubmit} className="htb-auth-form">
          <Input
            type="password"
            name="password"
            label="New Password"
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
            label="Confirm New Password"
            value={confirmPassword}
            onChange={onChange}
            placeholder="Repeat your new password"
            icon={<Lock size={18} />}
            required
            fullWidth
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Reset Password'}
          </Button>
        </form>

        <div className="htb-auth-footer">
          <p className="htb-auth-footer-text">
            <Link to="/login" className="htb-auth-link">Back to Sign In</Link>
          </p>
        </div>
      </>
    );
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
            Set a new<br />
            <span className="htb-gradient-text">Password</span>
          </h1>
          <p className="htb-auth-brand-subtitle">
            Once you save it, every other device will be signed out.
          </p>
        </motion.div>

        <motion.div
          className="htb-auth-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {renderBody()}
        </motion.div>
      </div>
    </div>
  );
}

export default ResetPassword;
