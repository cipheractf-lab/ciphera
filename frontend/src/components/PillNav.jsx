import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './PillNav.css';

function PillNav({
  logo,
  logoAlt = 'Brand logo',
  items = [],
  activeHref = '/',
  className = '',
  baseColor = '#000000',
  pillColor = '#ffffff',
  pillTextColor = '#000000',
  hoveredPillTextColor = '#ffffff',
  brandName = 'Ciphera',
  brandAccent = '',
  mobileExtraContent,
}) {
  const trackRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [hoveredHref, setHoveredHref] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, visible: false });

  const resolvedItems = useMemo(
    () => items.filter((item) => item && item.href && item.label),
    [items]
  );

  const currentHref = hoveredHref || activeHref || resolvedItems[0]?.href || '/';

  const brandParts = useMemo(() => {
    if (!brandAccent) {
      return { prefix: brandName, accent: '', suffix: '' };
    }

    const index = brandName.lastIndexOf(brandAccent);
    if (index === -1) {
      return { prefix: brandName, accent: '', suffix: '' };
    }

    return {
      prefix: brandName.slice(0, index),
      accent: brandName.slice(index, index + brandAccent.length),
      suffix: brandName.slice(index + brandAccent.length),
    };
  }, [brandAccent, brandName]);

  const navStyle = useMemo(
    () => ({
      '--pill-base': baseColor,
      '--pill-fill': pillColor,
      '--pill-text': pillTextColor,
      '--pill-hover-text': hoveredPillTextColor,
    }),
    [baseColor, hoveredPillTextColor, pillColor, pillTextColor]
  );

  const syncIndicator = (href) => {
    const itemNode = itemRefs.current.get(href);
    const trackNode = trackRef.current;

    if (!itemNode || !trackNode) {
      setIndicatorStyle((current) => ({ ...current, visible: false }));
      return;
    }

    const itemRect = itemNode.getBoundingClientRect();
    const trackRect = trackNode.getBoundingClientRect();

    setIndicatorStyle({
      left: itemRect.left - trackRect.left,
      width: itemRect.width,
      visible: true,
    });
  };

  useLayoutEffect(() => {
    syncIndicator(currentHref);
  }, [currentHref, resolvedItems]);

  useEffect(() => {
    const handleResize = () => syncIndicator(currentHref);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentHref]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setHoveredHref('');
  }, [activeHref]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`pill-nav ${className}`.trim()} style={navStyle}>
      <Link to="/" className="pill-nav__brand" aria-label={brandName}>
        <div className="pill-nav__logo-shell">
          {logo ? (
            <img src={logo} alt={logoAlt} className="pill-nav__logo" />
          ) : (
            <span className="pill-nav__logo-fallback">{brandName.charAt(0)}</span>
          )}
        </div>
        <div className="pill-nav__brand-copy">
          <span className="pill-nav__brand-wordmark">
            {brandParts.prefix}
            {brandParts.accent ? <span className="pill-nav__brand-accent">{brandParts.accent}</span> : null}
            {brandParts.suffix}
          </span>
          <span className="pill-nav__brand-tag">Cyber Arena</span>
        </div>
      </Link>

      <div className="pill-nav__desktop">
        <div
          ref={trackRef}
          className="pill-nav__track"
          onMouseLeave={() => {
            setHoveredHref('');
            syncIndicator(activeHref);
          }}
        >
          <span
            className={`pill-nav__indicator${indicatorStyle.visible ? ' is-visible' : ''}`}
            style={{ transform: `translateX(${indicatorStyle.left}px)`, width: indicatorStyle.width }}
          />
          {resolvedItems.map((item) => {
            const isIndicated = currentHref === item.href;

            return (
              <Link
                key={item.href}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(item.href, node);
                  } else {
                    itemRefs.current.delete(item.href);
                  }
                }}
                to={item.href}
                className={`pill-nav__item${activeHref === item.href ? ' is-active' : ''}${isIndicated ? ' is-indicated' : ''}`}
                onMouseEnter={() => {
                  setHoveredHref(item.href);
                  syncIndicator(item.href);
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="pill-nav__mobile-toggle"
        aria-expanded={isMobileMenuOpen}
        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setIsMobileMenuOpen((open) => !open)}
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {isMobileMenuOpen ? (
        <div className="pill-nav__mobile-panel">
          <div className="pill-nav__mobile-links">
            {resolvedItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`mobile-menu-link${activeHref === item.href ? ' is-active' : ''}`}
                onClick={closeMobileMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {mobileExtraContent ? mobileExtraContent({ closeMenu: closeMobileMenu }) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PillNav;
