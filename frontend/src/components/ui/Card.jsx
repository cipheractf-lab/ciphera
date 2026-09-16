import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import './Card.css';

export const Card = ({ children, className = '', glow = false, hover = true, ...props }) => {
  const classes = [
    'cyber-card',
    glow && 'cyber-card--glow',
    hover && 'cyber-card--hover',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      className={classes}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`cyber-card-header ${className}`}>
    {children}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`cyber-card-body ${className}`}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`cyber-card-footer ${className}`}>
    {children}
  </div>
);

// Alert variants
const alertIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  onClose, 
  className = '' 
}) => {
  const Icon = alertIcons[type];
  
  return (
    <motion.div
      className={`cyber-alert cyber-alert--${type} ${className}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <div className="cyber-alert__icon">
        <Icon size={20} />
      </div>
      <div className="cyber-alert__content">
        {title && <div className="cyber-alert__title">{title}</div>}
        {children && <div className="cyber-alert__message">{children}</div>}
      </div>
      {onClose && (
        <button className="cyber-alert__close" onClick={onClose}>
          <X size={18} />
        </button>
      )}
    </motion.div>
  );
};

// Badge component
export const Badge = ({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '' 
}) => {
  const classes = [
    'cyber-badge',
    `cyber-badge--${variant}`,
    `cyber-badge--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {children}
    </span>
  );
};

export default Card;
