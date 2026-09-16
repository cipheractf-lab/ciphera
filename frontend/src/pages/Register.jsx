import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, User, Users, FileText, ArrowLeft, UserPlus, Shield } from 'lucide-react';
import { Button } from '../components/ui';
import './Auth.css';

function Register() {
  return (
    <div className="htb-auth-container">
      {/* Animated Grid Background */}
      <div className="htb-auth-grid-bg"></div>
      
      {/* Main Content */}
      <div className="htb-auth-content">
        {/* Left Side - Branding */}
        <motion.div
          className="htb-auth-brand"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="htb-auth-brand-icon">
            <UserPlus size={48} />
          </div>
          <h1 className="htb-auth-brand-title">
            Join the<br />
            <span className="htb-gradient-text">Competition</span>
          </h1>
          <p className="htb-auth-brand-subtitle">
            Registration is managed by administrators to ensure platform security and quality
          </p>
        </motion.div>

        {/* Right Side - Registration Info */}
        <motion.div
          className="htb-auth-card"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="htb-auth-card-header">
            <h2>Request Access</h2>
            <p>Contact an administrator to create your account</p>
          </div>

          <div className="htb-register-info">
            <h3 className="htb-register-title">Required Information</h3>
            <p className="htb-register-description">
              Provide the following details when contacting us:
            </p>

            <div className="htb-register-requirements">
              <div className="htb-register-item">
                <div className="htb-register-icon">
                  <User size={18} />
                </div>
                <div className="htb-register-details">
                  <strong>Full Name</strong>
                  <span>Your complete name</span>
                </div>
              </div>

              <div className="htb-register-item">
                <div className="htb-register-icon">
                  <Mail size={18} />
                </div>
                <div className="htb-register-details">
                  <strong>Email Address</strong>
                  <span>Valid email for account access</span>
                </div>
              </div>

              <div className="htb-register-item">
                <div className="htb-register-icon">
                  <User size={18} />
                </div>
                <div className="htb-register-details">
                  <strong>Username</strong>
                  <span>Preferred display name</span>
                </div>
              </div>

              <div className="htb-register-item">
                <div className="htb-register-icon">
                  <Users size={18} />
                </div>
                <div className="htb-register-details">
                  <strong>Team Name</strong>
                  <span>Team for participation</span>
                </div>
              </div>

              <div className="htb-register-item">
                <div className="htb-register-icon">
                  <FileText size={18} />
                </div>
                <div className="htb-register-details">
                  <strong>Purpose</strong>
                  <span>Reason for joining</span>
                </div>
              </div>
            </div>

            <div className="htb-register-contact">
              <a href="mailto:ciphera@gmail.com" className="htb-register-email-button">
                <Mail size={20} />
                <span>ciphera@gmail.com</span>
              </a>
            </div>
          </div>

          <div className="htb-auth-footer">
            <p className="htb-auth-footer-text">
              Already have an account? <Link to="/login" className="htb-auth-link">Sign In</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
