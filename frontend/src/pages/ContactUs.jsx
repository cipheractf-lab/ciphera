import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Mail, Phone, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { Loading } from '../components/ui';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { useSiteConfig } from '../context/SiteConfigContext';
import './ContactUs.css';

function ContactUs() {
  const { eventName } = useSiteConfig();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      await axios.post('/api/contact', formData);
      setStatus({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' });
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to send message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading text="LOADING..." />;
  }

  return (
    <div className="htb-contact-container">
      <div className="htb-contact-grid-bg" />
      <div className="htb-contact-orb htb-contact-orb--primary" aria-hidden="true" />
      <div className="htb-contact-orb htb-contact-orb--secondary" aria-hidden="true" />
      <div className="htb-contact-orb htb-contact-orb--tertiary" aria-hidden="true" />
      
      <motion.div 
        className="htb-contact-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>Contact <span className="htb-highlight">Us</span></h1>
        <p className="htb-contact-subtitle">
          Have questions or need assistance? We're here to help.
        </p>
      </motion.div>

      <motion.div 
        className="htb-contact-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="htb-contact-grid">
          {/* Contact Info Cards */}
          <div className="htb-info-cards">
            <div className="htb-info-card-shell">
              <GlowingEffect
                spread={32}
                glow={true}
                disabled={false}
                proximity={82}
                inactiveZone={0.18}
                borderWidth={2}
              />
              <motion.div 
                className="htb-info-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="htb-info-content">
                  <h3><MapPin size={18} /> Location</h3>
                  <p>Sri Eshwar College of Engineering</p>
                  <p>Kinathukadavu, Coimbatore</p>
                  <p>Tamil Nadu, India</p>
                </div>
              </motion.div>
            </div>

            <div className="htb-info-card-shell">
              <GlowingEffect
                spread={32}
                glow={true}
                disabled={false}
                proximity={82}
                inactiveZone={0.18}
                borderWidth={2}
              />
              <motion.div 
                className="htb-info-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <div className="htb-info-content">
                  <h3><Mail size={18} /> Email</h3>
                  <p>ciphera@gmail.com</p>
                  <p className="htb-info-note">We'll respond within 24 hours</p>
                </div>
              </motion.div>
            </div>

            <div className="htb-info-card-shell">
              <GlowingEffect
                spread={32}
                glow={true}
                disabled={false}
                proximity={82}
                inactiveZone={0.18}
                borderWidth={2}
              />
              <motion.div 
                className="htb-info-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="htb-info-content">
                  <h3><Phone size={18} /> Phone</h3>
                  <p>+91 63819 26572</p>
                  <p className="htb-info-note">Mon-Fri, 9AM - 6PM IST</p>
                </div>
              </motion.div>
            </div>

            <div className="htb-info-card-shell">
              <GlowingEffect
                spread={32}
                glow={true}
                disabled={false}
                proximity={82}
                inactiveZone={0.18}
                borderWidth={2}
              />
              <motion.div 
                className="htb-info-card"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3, delay: 0.15 }}
              >
                <div className="htb-info-content">
                  <h3><MessageSquare size={18} /> Community</h3>
                  <p>Discord: {eventName}</p>
                  <p className="htb-info-note">Join our active community</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="htb-contact-form-shell">
            <GlowingEffect
              spread={38}
              glow={true}
              disabled={false}
              proximity={92}
              inactiveZone={0.12}
              borderWidth={2}
            />
            <motion.form 
              onSubmit={handleSubmit} 
              className="htb-contact-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="htb-form-header">
                <h2>Send us a Message</h2>
                <div className="htb-title-line" />
              </div>

              {status.message && (
                <motion.div 
                  className={`htb-form-alert ${status.type}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {status.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span>{status.message}</span>
                </motion.div>
              )}

              <div className="htb-form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div className="htb-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  autoComplete="off"
                  required
                />
              </div>

              <div className="htb-form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="What's this about?"
                  required
                />
              </div>

              <div className="htb-form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us more about your inquiry..."
                  rows="6"
                  required
                ></textarea>
              </div>

              <motion.button
                type="submit"
                className="htb-submit-btn"
                disabled={isSubmitting}
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="htb-spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Send Message</span>
                  </>
                )}
              </motion.button>
            </motion.form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ContactUs;
