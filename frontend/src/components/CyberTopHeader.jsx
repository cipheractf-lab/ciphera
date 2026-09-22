import React, { useContext, useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Users,
  ShieldAlert,
  LogOut,
  LogIn,
  ChevronDown,
  Sparkles,
  Maximize,
  Minimize,
  Sun,
  Moon,
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import NotificationCenter from './NotificationCenter';
import './CyberTopHeader.css';

export default function CyberTopHeader() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ciphera_theme') || 'dark';
  });
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ciphera_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Fullscreen listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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
        {/* Spacer on the left to push all utility actions to the top right */}
        <div className="cyber-top-spacer" />

        {/* Right Side: Fullscreen, Theme Toggle, Notices, and Profile */}
        <div className="cyber-top-actions">
          {/* Full Screen View Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="cyber-top-icon-btn"
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Full Screen View'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="cyber-top-icon-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

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
