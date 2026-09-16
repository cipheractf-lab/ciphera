import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ChevronDown, LogOut, Settings, User, Users } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useSiteConfig } from '../context/SiteConfigContext';
import axios from 'axios';
import { Badge } from './ui';
import PillNav from './PillNav';
import './Navbar.css';

const navLinks = [
  { path: '/', label: 'Home', auth: false },
  { path: '/challenges', label: 'Challenges', auth: true },
  
  { path: '/scoreboard', label: 'Leaderboard', auth: true },
  { path: '/event-status', label: 'Event Status', auth: false },
  { path: '/my-team', label: 'Team', auth: true },
  { path: '/contact', label: 'Contact', auth: false },
];

const adminLinks = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/configuration', label: 'Configuration' },
  { path: '/admin/event-control', label: 'Event Control' },
  { path: '/admin/create-user', label: 'Create User' },
  { path: '/admin/create-team', label: 'Create Team' },
  { path: '/admin/categories', label: 'Categories' },
  { path: '/admin/messages', label: 'Messages' },
  { path: '/admin/login-logs', label: 'Login Logs' },
  { path: '/admin/statistics', label: 'Statistics' },
  { path: '/admin/live-monitor', label: 'Live Monitor' },
  { path: '/admin/submissions', label: 'Submissions' },
];

function Navbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const { eventName, logoUrl } = useSiteConfig();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const userMenuRef = useRef(null);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsAdminMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('/api/notices/unread-count');
      setUnreadNoticeCount(response.data.count);
    } catch (err) {
      console.error('Error fetching unread notice count:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    setIsAdminMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const platformLogo = logoUrl || '/logo.jpeg';
  const brandAccent = useMemo(() => {
    const currentName = eventName || 'Ciphera';
    const lowered = currentName.toLowerCase();

    if (lowered.endsWith('quest')) {
      return currentName.slice(-5);
    }

    const parts = currentName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }, [eventName]);

  const primaryNavItems = useMemo(
    () =>
      navLinks
        .filter((link) => !(link.auth && !isAuthenticated))
        .map((link) => ({ label: link.label, href: link.path })),
    [isAuthenticated]
  );

  const renderMobileMenuExtras = ({ closeMenu }) => (
    <>
      {isAuthenticated ? (
        <div className="pill-mobile-section">
          <div className="pill-mobile-divider">Arena</div>
          <Link
            to="/notices"
            className={`mobile-menu-link${isActive('/notices') ? ' is-active' : ''}`}
            onClick={closeMenu}
          >
            <span>Notices</span>
            {unreadNoticeCount > 0 ? (
              <span className="pill-mobile-badge">{unreadNoticeCount}</span>
            ) : null}
          </Link>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="pill-mobile-section">
          <div className="pill-mobile-divider">Admin</div>
          {adminLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-menu-link${isActive(link.path) ? ' is-active' : ''}`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}

      {isAuthenticated ? (
        <div className="pill-mobile-section">
          <div className="pill-mobile-divider">Account</div>
          <div className="pill-mobile-user">
            <span className="pill-mobile-user-name">{user?.username}</span>
            <span className="pill-mobile-user-role">{user?.role}</span>
          </div>
          <Link
            to="/profile"
            className={`mobile-menu-link${isActive('/profile') ? ' is-active' : ''}`}
            onClick={closeMenu}
          >
            Profile
          </Link>
          <Link
            to="/my-team"
            className={`mobile-menu-link${isActive('/my-team') ? ' is-active' : ''}`}
            onClick={closeMenu}
          >
            My Team
          </Link>
          <button
            type="button"
            className="mobile-menu-link mobile-menu-link--danger"
            onClick={() => {
              closeMenu();
              handleLogout();
            }}
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="pill-mobile-section">
          <div className="pill-mobile-divider">Access</div>
          <Link
            to="/login"
            className={`mobile-menu-link${isActive('/login') ? ' is-active' : ''}`}
            onClick={closeMenu}
          >
            Login
          </Link>
        </div>
      )}
    </>
  );

  return (
    <nav className={`cyber-navbar ${scrolled ? 'cyber-navbar--scrolled' : ''}`}>
      <div className="cyber-navbar-container">
        <PillNav
          logo={platformLogo}
          logoAlt={`${eventName || 'Ciphera'} logo`}
          items={primaryNavItems}
          activeHref={location.pathname}
          className="cyber-navbar-pill"
          ease="power2.easeOut"
          baseColor="#000000"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#000000"
          theme="light"
          brandName={eventName || 'Ciphera'}
          brandAccent={brandAccent}
          initialLoadAnimation={false}
          mobileExtraContent={renderMobileMenuExtras}
        />

        <div className="cyber-navbar-actions cyber-navbar-actions--desktop">
          {isAdmin && (
            <div className="cyber-navbar-dropdown" ref={adminMenuRef}>
              <button
                type="button"
                className="cyber-navbar-link cyber-navbar-link--dropdown"
                onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              >
                <Settings size={18} />
                <span>Admin</span>
                <ChevronDown size={16} className={`cyber-navbar-chevron ${isAdminMenuOpen ? 'cyber-navbar-chevron--open' : ''}`} />
              </button>
              <AnimatePresence>
                {isAdminMenuOpen && (
                  <motion.div
                    className="cyber-navbar-dropdown-menu"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {adminLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="cyber-navbar-dropdown-item"
                        onClick={() => setIsAdminMenuOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {isAuthenticated && (
            <Link
              to="/notices"
              className={`cyber-navbar-link ${isActive('/notices') ? 'cyber-navbar-link--active' : ''}`}
            >
              <div className="cyber-navbar-notice-icon">
                <Bell size={18} />
                {unreadNoticeCount > 0 && (
                  <Badge variant="danger" size="sm" className="cyber-navbar-badge">
                    {unreadNoticeCount}
                  </Badge>
                )}
              </div>
              <span>Notices</span>
            </Link>
          )}

          {isAuthenticated ? (
            <div className="cyber-navbar-user" ref={userMenuRef}>
              <button
                type="button"
                className="cyber-navbar-user-button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="cyber-navbar-avatar">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="cyber-navbar-username">{user?.username}</span>
                <ChevronDown size={16} className={`cyber-navbar-chevron ${isUserMenuOpen ? 'cyber-navbar-chevron--open' : ''}`} />
              </button>
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    className="cyber-navbar-user-menu"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="cyber-navbar-user-info">
                      <div className="cyber-navbar-user-name">{user?.username}</div>
                      <div className="cyber-navbar-user-role">{user?.role}</div>
                    </div>
                    <div className="cyber-navbar-user-menu-divider"></div>
                    <Link to="/profile" className="cyber-navbar-user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                      <User size={16} />
                      <span>Profile</span>
                    </Link>
                    <Link to="/my-team" className="cyber-navbar-user-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                      <Users size={16} />
                      <span>My Team</span>
                    </Link>
                    <div className="cyber-navbar-user-menu-divider"></div>
                    <button type="button" className="cyber-navbar-user-menu-item cyber-navbar-user-menu-item--danger" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="cyber-navbar-login-button">
              <User size={18} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
