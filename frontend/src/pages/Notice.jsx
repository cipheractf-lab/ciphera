import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, User, ChevronLeft, AlertCircle } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './Notice.css';

function Notice() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    fetchNotices();
    markAllAsRead();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notices');
      setNotices(response.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notices:', err);
      setError('Failed to load notices. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!isAuthenticated) return;
    
    try {
      await axios.post('/api/notices/mark-all-read');
      // Notify navbar to update badge
      setTimeout(() => {
        window.dispatchEvent(new Event('noticeRead'));
      }, 500);
    } catch (err) {
      console.error('Error marking all notices as read:', err);
    }
  };

  const markAsRead = async (noticeId) => {
    if (!isAuthenticated) return;
    
    try {
      await axios.post(`/api/notices/${noticeId}/mark-read`);
    } catch (err) {
      console.error('Error marking notice as read:', err);
    }
  };

  const handleNoticeClick = (notice) => {
    setSelectedNotice(notice);
  };

  if (loading) {
    return <Loading text="LOADING NOTICES..." />;
  }

  return (
    <div className="htb-notice-container">
      <div className="htb-notice-grid-bg" />
      <div className="htb-notice-orb htb-notice-orb--primary" aria-hidden="true" />
      <div className="htb-notice-orb htb-notice-orb--secondary" aria-hidden="true" />
      <div className="htb-notice-orb htb-notice-orb--tertiary" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {selectedNotice ? (
          <motion.div 
            key="detail"
            className="htb-notice-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
          >
            <motion.button 
              className="htb-back-btn" 
              onClick={() => setSelectedNotice(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ChevronLeft size={20} />
              <span>Back to Notices</span>
            </motion.button>

            <motion.div 
              className="htb-detail-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="htb-detail-header">
                <h1>{selectedNotice.title}</h1>
                <div className="htb-detail-meta">
                  <div className="htb-meta-item">
                    <User size={16} />
                    <span>{selectedNotice.createdBy?.username || 'Admin'}</span>
                  </div>
                  <div className="htb-meta-item">
                    <Calendar size={16} />
                    <span>{new Date(selectedNotice.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                </div>
              </div>

              <div className="htb-detail-content">
                <div className="htb-content-text">
                  {selectedNotice.description}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="htb-notice-header"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="htb-header-content">
                <h1>Event <span className="htb-highlight">Notices</span></h1>
                <p>Important information and guidelines for events</p>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                className="htb-error-alert"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div 
              className="htb-notices-main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {notices.length === 0 ? (
                <div className="htb-empty-state">
                  <Bell size={64} />
                  <p>No notices at the moment.</p>
                  <p className="htb-empty-sub">Check back soon for important event information!</p>
                </div>
              ) : (
                <div className="htb-notices-grid">
                  {notices.map((notice, index) => (
                    <motion.div 
                      key={notice._id}
                      className="htb-notice-card"
                      onClick={() => handleNoticeClick(notice)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="htb-notice-title">{notice.title}</div>
                      
                      <div className="htb-notice-meta">
                        <div className="htb-notice-author">
                          <User size={14} />
                          <span>{notice.createdBy?.username || 'admin'}</span>
                        </div>
                        <div className="htb-notice-date">
                          <Calendar size={14} />
                          <span>
                            {new Date(notice.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="htb-notice-preview">
                        {notice.description}
                      </div>

                      <div className="htb-read-more">
                        <span>View Full Notice</span>
                        <motion.span
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          →
                        </motion.span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Notice;
