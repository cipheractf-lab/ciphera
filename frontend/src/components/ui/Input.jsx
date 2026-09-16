import React from 'react';
import './Input.css';

const Input = ({
  type = 'text',
  label,
  error,
  hint,
  icon,
  fullWidth = false,
  className = '',
  required = false,
  ...props
}) => {
  const inputClasses = [
    'cyber-input',
    icon && 'cyber-input--with-icon',
    error && 'cyber-input--error',
    fullWidth && 'cyber-input--full',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="cyber-input-wrapper">
      {label && (
        <label className="cyber-input-label">
          {label}
          {required && <span className="cyber-input-required">*</span>}
        </label>
      )}
      <div className="cyber-input-container">
        {icon && <div className="cyber-input-icon">{icon}</div>}
        <input
          type={type}
          className={inputClasses}
          required={required}
          autoComplete="off"
          {...props}
        />
      </div>
      {error && <span className="cyber-input-error">{error}</span>}
      {hint && !error && <span className="cyber-input-hint">{hint}</span>}
    </div>
  );
};

export default Input;
