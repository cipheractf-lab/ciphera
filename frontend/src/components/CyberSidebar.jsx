  import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Flag,
  Trophy,
  Activity,
  Users,
  Bell,
  Mail,
  ShieldAlert,
  LogOut,
  LogIn,
  User,
  Menu,
  X,
  Radio,
  ExternalLink,
  Lock,
} from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import axios from 'axios';
import './CyberSidebar.css';

const adminLinks = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/configuration', label: 'Configuration' },
  { path: '/admin/events', label: 'Events' },
  { path: '/admin/create-user', label: 'Create User' },
  { path: '/admin/create-team', label: 'Create Team' },
  { path: '/admin/categories', label: 'Categories' },
  { path: '/admin/messages', label: 'Messages' },
  { path: '/admin/login-logs', label: 'Login Logs' },
  { path: '/admin/statistics', label: 'Statistics' },
  { path: '/admin/live-monitor', label: 'Live Monitor' },
  { path: '/admin/submissions', label: 'Submissions' },
  { path: '/admin/platform-reset', label: 'Platform Reset' },
];

export default function CyberSidebar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const { eventName, logoUrl } = useSiteConfig();
  const location = useLocation();
  const navigate = useNavigate();

  const [isAdminFlyoutOpen, setIsAdminFlyoutOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);

  const adminMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const platformLogo = logoUrl || '/assests/ciphera.png';
  const platformName = eventName || 'Ciphera';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Navigation Items
  const navItems = useMemo(
    () => [
      { path: '/', label: 'Home', icon: Home, auth: false },
      { path: '/challenges', label: 'Challenges', icon: Flag, auth: true },
      { path: '/scoreboard', label: 'Leaderboard', icon: Trophy, auth: true },
      { path: '/events', label: 'Events', icon: Activity, auth: false },
      { path: '/my-team', label: 'Squad', icon: Users, auth: true },
      { path: '/contact', label: 'Contact', icon: Mail, auth: false },
    ],
    []
  );

  // Filter accessible links
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => !(item.auth && !isAuthenticated)),
    [navItems, isAuthenticated]
  );

  // Poll unread notices
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  // Close menus on route change
  useEffect(() => {
    setIsAdminFlyoutOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileDrawerOpen(false);
  }, [location.pathname]);

  // Handle outside clicks
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setIsAdminFlyoutOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notices/unread-count');
      setUnreadNoticeCount(response.data.count || 0);
    } catch (err) {
      console.error('Error fetching unread notice count:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsMobileDrawerOpen(false);
    navigate('/');
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP / TABLET STATIC CYBER COMMAND RAIL (Left Side) */}
      {/* ========================================================================= */}
      <aside
        className="cyber-rail-shell"
        aria-label="Cyber Navigation Rail"
      >
        <div className="cyber-rail-card">
          {/* Top: Glowing Brand Capsule */}
          <div className="cyber-rail-header">
            <Link to="/" className="cyber-rail-brand">
              <div className="cyber-rail-logo-wrap">
                <img
                  src={platformLogo}
                  alt={`${platformName} logo`}
                  className="cyber-rail-logo"
                  onError={(e) => {
                    if (!e.currentTarget.src.endsWith('/assests/ciphera.png')) {
                      e.currentTarget.src = '/assests/ciphera.png';
                    }
                  }}
                />
                <span className="cyber-rail-pulse-ring" />
              </div>
              <div className="cyber-rail-brand-text">
                <span className="cyber-rail-title">
                  {platformName.toUpperCase() === 'CIPHERA' ? (
                    <>
                      <span className="ciphera-chrome-silver">CIPHE</span>
                      <span className="ciphera-chrome-violet">RA</span>
                    </>
                  ) : (
                    <span className="ciphera-chrome-silver">{platformName.toUpperCase()}</span>
                  )}
                </span>
                <span className="cyber-rail-status">
                  <span className="cyber-rail-status-dot" />
                  ARENA ONLINE
                </span>
              </div>
            </Link>
          </div>

          {/* Middle: Navigation Items */}
          <nav className="cyber-rail-nav">
            <ul className="cyber-rail-nav-list">
              {visibleNavItems.map((item) => {
                const ItemIcon = item.icon;
                const active = isActive(item.path);

                return (
                  <li key={item.path} className="cyber-rail-nav-item">
                    <Link
                      to={item.path}
                      className={`cyber-rail-link ${active ? 'is-active' : ''}`}
                    >
                      <div className="cyber-rail-icon-wrap">
                        <ItemIcon size={20} className="cyber-rail-icon" />
                        {item.badge && item.badge > 0 ? (
                          <span className="cyber-rail-badge">{item.badge}</span>
                        ) : null}
                      </div>

                      <span className="cyber-rail-link-label">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}

              {/* Admin Matrix trigger (if admin) */}
              {isAdmin && (
                <li className="cyber-rail-nav-item" ref={adminMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsAdminFlyoutOpen(!isAdminFlyoutOpen)}
                    className={`cyber-rail-link cyber-rail-link--admin ${
                      location.pathname.startsWith('/admin') ? 'is-active' : ''
                    }`}
                  >
                    <div className="cyber-rail-icon-wrap">
                      <ShieldAlert size={20} className="cyber-rail-icon" />
                    </div>

                    <div className="cyber-rail-link-label-wrap">
                      <span className="cyber-rail-link-label">Admin Matrix</span>
                      <span className="cyber-rail-admin-tag">SYS</span>
                    </div>
                  </button>

                  {/* Admin Flyout Popover */}
                  <AnimatePresence>
                    {isAdminFlyoutOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: 14, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 14, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="cyber-rail-admin-popover"
                      >
                        <div className="cyber-rail-popover-header">
                          <ShieldAlert size={16} className="text-[#A855F7]" />
                          <span>Admin Control Matrix</span>
                        </div>
                        <div className="cyber-rail-popover-grid">
                          {adminLinks.map((link) => (
                            <Link
                              key={link.path}
                              to={link.path}
                              className={`cyber-rail-popover-item ${
                                location.pathname === link.path ? 'is-active' : ''
                              }`}
                              onClick={() => setIsAdminFlyoutOpen(false)}
                            >
                              <span className="cyber-rail-popover-dot" />
                              <span>{link.label}</span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE CYBER DOCK (Floating Bottom Nav on < 1024px) */}
      {/* ========================================================================= */}
      <nav className="cyber-mobile-dock" aria-label="Mobile Navigation Dock">
        <div className="cyber-mobile-dock-inner">
          <Link
            to="/"
            className={`cyber-mobile-dock-btn ${isActive('/') ? 'is-active' : ''}`}
            title="Home"
          >
            <Home size={20} />
            <span>Home</span>
          </Link>

          <Link
            to="/challenges"
            className={`cyber-mobile-dock-btn ${isActive('/challenges') ? 'is-active' : ''}`}
            title="Challenges"
          >
            <Flag size={20} />
            <span>Challenges</span>
          </Link>

          <Link
            to="/scoreboard"
            className={`cyber-mobile-dock-btn ${isActive('/scoreboard') ? 'is-active' : ''}`}
            title="Leaderboard"
          >
            <Trophy size={20} />
            <span>Scores</span>
          </Link>

          {isAuthenticated ? (
            <Link
              to="/my-team"
              className={`cyber-mobile-dock-btn ${isActive('/my-team') ? 'is-active' : ''}`}
              title="Team"
            >
              <Users size={20} />
              <span>Squad</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className={`cyber-mobile-dock-btn ${isActive('/login') ? 'is-active' : ''}`}
              title="Login"
            >
              <LogIn size={20} />
              <span>Login</span>
            </Link>
          )}

          {/* Tactical Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="cyber-mobile-dock-btn cyber-mobile-dock-btn--menu"
            title="Open Tactical Menu"
          >
            <Menu size={20} />
            <span>Menu</span>
            {unreadNoticeCount > 0 && <span className="cyber-mobile-dock-dot" />}
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* MOBILE TACTICAL COMMAND SHEET (Slide-up drawer for mobile) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="cyber-mobile-drawer-root">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="cyber-mobile-drawer-backdrop"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="cyber-mobile-drawer-sheet"
            >
              <div className="cyber-mobile-drawer-handle" />

              <div className="cyber-mobile-drawer-header">
                <div className="cyber-mobile-drawer-brand">
                  <img src={platformLogo} alt="Logo" className="cyber-mobile-drawer-logo" />
                  <div>
                    <h2 className="cyber-mobile-drawer-title">{platformName}</h2>
                    <span className="cyber-mobile-drawer-tag">TACTICAL COMMAND</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="cyber-mobile-drawer-close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="cyber-mobile-drawer-content">
                {/* User Info Bar if logged in */}
                {isAuthenticated && user && (
                  <div className="cyber-mobile-user-card">
                    <div className="cyber-rail-avatar">
                      <span>{user.username?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="cyber-mobile-user-meta">
                      <div className="cyber-mobile-user-name">{user.username}</div>
                      <div className="cyber-mobile-user-role">{user.role} • Authenticated</div>
                    </div>
                    <Link
                      to="/profile"
                      className="cyber-mobile-profile-link"
                      onClick={() => setIsMobileDrawerOpen(false)}
                    >
                      Profile
                    </Link>
                  </div>
                )}

                {/* Primary Navigation Links */}
                <div className="cyber-mobile-section">
                  <div className="cyber-mobile-section-title">Navigation</div>
                  <div className="cyber-mobile-links-grid">
                    <Link
                      to="/event-status"
                      className="cyber-mobile-link-item"
                      onClick={() => setIsMobileDrawerOpen(false)}
                    >
                      <Activity size={18} className="text-[#A855F7]" />
                      <span>Event Status</span>
                    </Link>
                    {isAuthenticated && (
                      <Link
                        to="/notices"
                        className="cyber-mobile-link-item"
                        onClick={() => setIsMobileDrawerOpen(false)}
                      >
                        <Bell size={18} className="text-[#A855F7]" />
                        <span>Notices</span>
                        {unreadNoticeCount > 0 && (
                          <span className="cyber-mobile-badge">{unreadNoticeCount}</span>
                        )}
                      </Link>
                    )}
                    <Link
                      to="/contact"
                      className="cyber-mobile-link-item"
                      onClick={() => setIsMobileDrawerOpen(false)}
                    >
                      <Mail size={18} className="text-[#A855F7]" />
                      <span>Contact Us</span>
                    </Link>
                  </div>
                </div>

                {/* Admin Operations if Admin */}
                {isAdmin && (
                  <div className="cyber-mobile-section">
                    <div className="cyber-mobile-section-title">Admin Operations</div>
                    <div className="cyber-mobile-admin-grid">
                      {adminLinks.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="cyber-mobile-admin-item"
                          onClick={() => setIsMobileDrawerOpen(false)}
                        >
                          <span className="cyber-mobile-admin-dot" />
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer / Logout */}
                <div className="cyber-mobile-drawer-footer">
                  {isAuthenticated ? (
                    <button
                      onClick={handleLogout}
                      className="cyber-mobile-logout-btn"
                    >
                      <LogOut size={16} />
                      <span>Disconnect Session</span>
                    </button>
                  ) : (
                    <div className="cyber-mobile-auth-actions">
                      <Link
                        to="/login"
                        className="cyber-mobile-btn-login"
                        onClick={() => setIsMobileDrawerOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        className="cyber-mobile-btn-register"
                        onClick={() => setIsMobileDrawerOpen(false)}
                      >
                        Create Squad Account
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
