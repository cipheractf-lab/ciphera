import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Trash2, ChevronLeft, User, Clock, AlertTriangle,
  CheckCircle, RefreshCw, MessageSquare, Inbox
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './AdminContactMessages.css';

function AdminContactMessages() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    fetchMessages();
  }, [searchParams]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get('/api/contact');
      const messagesArray = Array.isArray(res.data) ? res.data : res.data.messages;

      if (Array.isArray(messagesArray)) {
        setMessages(messagesArray);

        const messageId = searchParams.get('id');
        if (messageId) {
          const message = messagesArray.find(m => m._id === messageId);
          if (message) {
            setSelectedMessage(message);
          }
        }
      } else {
        setError('Invalid data format received from server');
        setMessages([]);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to fetch messages. Please try again.');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get('/api/contact');
      const messagesArray = Array.isArray(res.data) ? res.data : res.data.messages;

      if (Array.isArray(messagesArray)) {
        setMessages(messagesArray);
        setSuccessMessage('Messages refreshed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setMessages([]);
        setError('Invalid data format received from server');
      }
    } catch (err) {
      console.error('Error refreshing messages:', err);
      setError('Failed to refresh messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      await axios.delete(`/api/contact/${messageId}`);

      setMessages(messages.filter(msg => msg._id !== messageId));

      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(null);
      }

      setSuccessMessage('Message deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading && !messages.length) {
    return (
      <div className="htb-messages-container">
        <div className="htb-messages-grid-bg"></div>
        <div className="htb-messages-orb htb-messages-orb--primary" aria-hidden="true" />
        <div className="htb-messages-orb htb-messages-orb--secondary" aria-hidden="true" />
        <div className="htb-messages-orb htb-messages-orb--tertiary" aria-hidden="true" />
        <Loading text="LOADING MESSAGES..." />
      </div>
    );
  }

  return (
    <div className="htb-messages-container">
      <div className="htb-messages-grid-bg"></div>
      <div className="htb-messages-orb htb-messages-orb--primary" aria-hidden="true" />
      <div className="htb-messages-orb htb-messages-orb--secondary" aria-hidden="true" />
      <div className="htb-messages-orb htb-messages-orb--tertiary" aria-hidden="true" />

      <motion.div 
        className="htb-messages-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="htb-messages-title-section">
          <h1 className="htb-messages-title">
            <Mail size={32} />
            CONTACT <span className="htb-text-primary">MESSAGES</span>
          </h1>
          <p className="htb-messages-subtitle">Manage contact form submissions from users</p>
        </div>
        <div className="htb-header-actions">
          <motion.button
            className="htb-refresh-btn"
            onClick={handleRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={18} /> Refresh
          </motion.button>
          <button className="htb-back-btn" onClick={() => navigate('/admin')}>
            <ChevronLeft size={18} /> Back to Dashboard
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            className="htb-alert htb-alert-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertTriangle size={18} />
            {error}
          </motion.div>
        )}
        {successMessage && (
          <motion.div 
            className="htb-alert htb-alert-success"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <CheckCircle size={18} />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="htb-messages-layout">
        {/* Messages List */}
        <motion.div 
          className="htb-messages-list"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="htb-list-header">
            <h2>
              <Inbox size={20} />
              All Messages ({messages.length})
            </h2>
          </div>

          <div className="htb-message-cards">
            {messages.length > 0 ? (
              messages.map((message, idx) => (
                <motion.div
                  key={message._id}
                  className={`htb-message-card ${selectedMessage?._id === message._id ? 'selected' : ''}`}
                  onClick={() => setSelectedMessage(message)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="htb-message-card-header">
                    <h3>{message.subject || 'No Subject'}</h3>
                    <motion.button
                      className="htb-delete-btn-quick"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(message._id);
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete message"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                  <p className="htb-message-preview">
                    {message.message ? message.message.substring(0, 100) + '...' : 'No message content'}
                  </p>
                  <div className="htb-message-footer">
                    <span className="htb-sender">
                      <User size={14} />
                      {message.name || 'Anonymous'}
                    </span>
                    <span className="htb-date">
                      <Clock size={14} />
                      {message.createdAt ? new Date(message.createdAt).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="htb-empty-state">
                <MessageSquare size={48} className="htb-empty-icon" />
                <p>No messages found</p>
                <span className="htb-empty-subtitle">Contact form submissions will appear here</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Message Detail */}
        <motion.div 
          className="htb-message-detail"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {selectedMessage ? (
            <>
              <div className="htb-detail-header">
                <h2>{selectedMessage.subject || 'No Subject'}</h2>
                <motion.button
                  className="htb-delete-btn"
                  onClick={() => handleDeleteMessage(selectedMessage._id)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 size={18} /> Delete
                </motion.button>
              </div>

              <div className="htb-detail-info">
                <div className="htb-info-row">
                  <User size={18} />
                  <div>
                    <span className="htb-info-label">From:</span>
                    <span className="htb-info-value">{selectedMessage.name}</span>
                  </div>
                </div>
                <div className="htb-info-row">
                  <Mail size={18} />
                  <div>
                    <span className="htb-info-label">Email:</span>
                    <span className="htb-info-value">{selectedMessage.email}</span>
                  </div>
                </div>
                <div className="htb-info-row">
                  <Clock size={18} />
                  <div>
                    <span className="htb-info-label">Date:</span>
                    <span className="htb-info-value">{formatDate(selectedMessage.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="htb-detail-content">
                <h3>Message:</h3>
                <p>{selectedMessage.message}</p>
              </div>
            </>
          ) : (
            <div className="htb-no-selection">
              <MessageSquare size={64} className="htb-no-selection-icon" />
              <h2>Select a message to view details</h2>
              <p>Click on any message from the list to view its contents.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default AdminContactMessages;
