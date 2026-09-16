import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronRight } from 'lucide-react';
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
      <div className="htb-footer-content">
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
                <Shield size={32} />
              )}
            </div>
            <span className="htb-logo-text">
              {eventName}
            </span>
          </Link>
          <p className="htb-footer-tagline">
            Empowering the next generation of cybersecurity professionals through hands-on challenges and competitions.
          </p>
        </div>

        {/* Navigation Columns */}
        <div className="htb-footer-nav-group">
          <div className="htb-footer-column">
            <h3 className="htb-footer-heading">
              <span className="htb-heading-line"></span>
              Platform
            </h3>
            <Link to="/" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Home</span>
            </Link>
            <Link to="/challenges" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Challenges</span>
            </Link>
            <Link to="/scoreboard" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Scoreboard</span>
            </Link>
          </div>

          <div className="htb-footer-column">
            <h3 className="htb-footer-heading">
              <span className="htb-heading-line"></span>
              Company
            </h3>
            <Link to="/privacy-policy" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Privacy Policy</span>
            </Link>
            <Link to="/terms-of-service" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Terms of Service</span>
            </Link>
            <Link to="/contact" className="htb-footer-link">
              <ChevronRight size={16} />
              <span>Contact Us</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="htb-footer-bottom">
        <div className="htb-footer-bottom-line"></div>
        <div className="htb-footer-bottom-content">
          <p className="htb-footer-copyright">
            © {new Date().getFullYear()} {eventName}. All Rights Reserved.
          </p>
          <p className="htb-footer-disclaimer">
            {eventName} is designed for educational purposes only. Always practice ethical hacking.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;