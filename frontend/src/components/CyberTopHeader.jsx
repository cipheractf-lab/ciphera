import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, ShieldAlert, LogOut, LogIn, ChevronDown, Sparkles } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import './CyberTopHeader.css';

export default function CyberTopHeader() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="cyber-top-header" aria-label="Top Utility Bar">
      <div className="cyber-top-header-inner">
        {/* Left Side: System Telemetry / Breadcrumb Indicator */}
        <div className="cyber-top-status-indicator">
          <span className="cyber-top-pulse-beacon" />
          <span className="cyber-top-status-text">NODE 01 // READY</span>
        </div>

        {/* Right Side: Notices (NotificationCenter) + Profile Capsule */}
        <div className="cyber-top-actions">
          {isAuthenticated ? (
            <>
              {/* Notices / Notification Bell */}
              <div className="cyber-top-notices-wrap" title="Announcements & Notices">
                <NotificationCenter />
              </div>

              {/* Profile Capsule */}
              <div className="cyber-top-profile-wrap" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`cyber-top-profile-btn ${isProfileMenuOpen ? 'is-active' : ''}`}
                  aria-expanded={isProfileMenuOpen}
                >
                  <div className="cyber-top-avatar">
                    <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                    <span className="cyber-top-avatar-pulse" />
                  </div>

                  <div className="cyber-top-user-info">
                    <span className="cyber-top-username">{user?.username}</span>
                    <span className="cyber-top-role">{user?.role || 'operator'}</span>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`cyber-top-chevron ${isProfileMenuOpen ? 'is-rotated' : ''}`}
                  />
                </button>

                {/* Profile Popover Dropdown */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="cyber-top-popover"
                    >
                      <div className="cyber-top-popover-header">
                        <div className="cyber-top-popover-avatar">
                          <span>{user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                        </div>
                        <div className="cyber-top-popover-meta">
                          <div className="cyber-top-popover-name">{user?.username}</div>
                          <div className="cyber-top-popover-email">{user?.email}</div>
                        </div>
                      </div>

                      <div className="cyber-top-popover-divider" />

                      <div className="cyber-top-popover-links">
                        <Link
                          to="/profile"
                          className="cyber-top-popover-item"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <User size={15} className="cyber-top-popover-icon" />
                          <span>Profile & Badges</span>
                        </Link>

                        <Link
                          to="/my-team"
                          className="cyber-top-popover-item"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Users size={15} className="cyber-top-popover-icon" />
                          <span>Squad Details</span>
                        </Link>

                        <Link
                          to="/notices"
                          className="cyber-top-popover-item"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <Sparkles size={15} className="cyber-top-popover-icon text-[#A855F7]" />
                          <span>All Notices & Intel</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="cyber-top-popover-item cyber-top-popover-item--admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <ShieldAlert size={15} className="cyber-top-popover-icon text-[#EC4899]" />
                            <span>Admin Matrix</span>
                          </Link>
                        )}
                      </div>

                      <div className="cyber-top-popover-divider" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="cyber-top-popover-item cyber-top-popover-item--danger"
                      >
                        <LogOut size={15} className="cyber-top-popover-icon" />
                        <span>Disconnect (Logout)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="cyber-top-auth-buttons">
              <Link to="/login" className="cyber-top-login-btn">
                <LogIn size={15} />
                <span>Login</span>
              </Link>
              <Link to="/register" className="cyber-top-register-btn">
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
