import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useSiteConfig } from '../context/SiteConfigContext';
import './Footer.css';

const Footer = () => {
  const { eventName, logoUrl } = useSiteConfig();
  const [logoLoadError, setLogoLoadError] = useState(false);

  useEffect(() => {
    setLogoLoadError(false);
  }, [logoUrl]);

  return (
    <footer className="htb-footer">
      <div className="htb-footer-container">
        <div className="htb-footer-top">
          {/* Brand Section */}
          <div className="htb-footer-brand">
            <Link to="/" className="htb-footer-logo">
              <div className="htb-logo-icon">
                {logoUrl && !logoLoadError ? (
                  <img
                    src={`${logoUrl}${logoUrl.includes('?') ? '&' : '?'}v=${Date.now()}`}
                    alt={`${eventName} logo`}
                    className="htb-footer-logo-image"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <Shield size={20} />
                )}
              </div>
              <span className="htb-logo-text">{eventName}</span>
            </Link>
            <p className="htb-footer-tagline">
              Empowering cybersecurity professionals through focused hands-on challenges and tactical operations.
            </p>
          </div>

          {/* Navigation Columns */}
          <div className="htb-footer-nav-group">
            <div className="htb-footer-column">
              <h4 className="htb-footer-heading">Platform</h4>
              <nav className="htb-footer-links">
                <Link to="/" className="htb-footer-link">Home</Link>
                <Link to="/challenges" className="htb-footer-link">Challenges</Link>
                <Link to="/scoreboard" className="htb-footer-link">Scoreboard</Link>
              </nav>
            </div>

            <div className="htb-footer-column">
              <h4 className="htb-footer-heading">Company</h4>
              <nav className="htb-footer-links">
                <Link to="/privacy-policy" className="htb-footer-link">Privacy Policy</Link>
                <Link to="/terms-of-service" className="htb-footer-link">Terms of Service</Link>
                <Link to="/contact" className="htb-footer-link">Contact Us</Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="htb-footer-bottom">
          <p className="htb-footer-copyright">
            © {new Date().getFullYear()} {eventName}. All rights reserved.
          </p>
          <p className="htb-footer-disclaimer">
            Designed for educational purposes only. Always practice ethical hacking.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;