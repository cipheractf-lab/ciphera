import React from 'react';
import { motion } from 'framer-motion';
import './Terminal.css';

const Terminal = ({ children, title = 'TERMINAL', className = '' }) => {
  return (
    <motion.div
      className={`cyber-terminal ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="cyber-terminal-header">
        <div className="cyber-terminal-controls">
          <span className="cyber-terminal-dot cyber-terminal-dot--close"></span>
          <span className="cyber-terminal-dot cyber-terminal-dot--minimize"></span>
          <span className="cyber-terminal-dot cyber-terminal-dot--maximize"></span>
        </div>
        <div className="cyber-terminal-title">{title}</div>
      </div>
      <div className="cyber-terminal-body scanlines">
        {children}
      </div>
    </motion.div>
  );
};

export const TerminalLine = ({ 
  prompt = '$', 
  command, 
  output, 
  error = false,
  typing = false 
}) => {
  return (
    <div className="cyber-terminal-line">
      {command && (
        <div className="cyber-terminal-command">
          <span className="cyber-terminal-prompt">{prompt}</span>
          <span className={typing ? 'cyber-terminal-typing' : ''}>
            {command}
          </span>
        </div>
      )}
      {output && (
        <div className={`cyber-terminal-output ${error ? 'cyber-terminal-output--error' : ''}`}>
          {output}
        </div>
      )}
    </div>
  );
};

export default Terminal;
