import React from 'react';
import { motion } from 'framer-motion';
import './Loading.css';

const Loading = ({ text = 'LOADING...', fullScreen = false }) => {
  const containerClass = fullScreen ? 'cyber-loading cyber-loading--fullscreen' : 'cyber-loading';
  
  return (
    <div className={containerClass}>
      <div className="cyber-loading-content">
        <div className="cyber-loading-spinner">
          <div className="cyber-loading-spinner-ring"></div>
          <div className="cyber-loading-spinner-ring"></div>
          <div className="cyber-loading-spinner-ring"></div>
        </div>
        <motion.div
          className="cyber-loading-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.div>
      </div>
    </div>
  );
};

export default Loading;
