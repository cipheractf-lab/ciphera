import React from 'react';
import { motion } from 'framer-motion';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  onClick,
  type = 'button',
  className = '',
  ...props
}) => {
  const classes = [
    'cyber-button',
    `cyber-button--${variant}`,
    `cyber-button--${size}`,
    fullWidth && 'cyber-button--full',
    disabled && 'cyber-button--disabled',
    loading && 'cyber-button--loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <motion.button
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      {...props}
    >
      {loading ? (
        <span className="cyber-button__loader">
          <span></span>
          <span></span>
          <span></span>
        </span>
      ) : (
        <>
          {icon && <span className="cyber-button__icon">{icon}</span>}
          <span className="cyber-button__text">{children}</span>
        </>
      )}
    </motion.button>
  );
};

export default Button;
