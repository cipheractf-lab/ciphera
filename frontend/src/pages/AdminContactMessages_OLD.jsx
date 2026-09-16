import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
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
  // const [replyContent, setReplyContent] = useState(''); // Removed reply state

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('Fetching messages');
        const res = await axios.get('/api/contact');
        console.log('Raw API response:', res);
        console.log('Response data:', res.data);

        // Handle both array and object responses
        const messagesArray = Array.isArray(res.data) ? res.data : res.data.messages;

        if (Array.isArray(messagesArray)) {
          console.log('Messages array:', messagesArray);
          setMessages(messagesArray);
        } else {
          console.error('Invalid messages data format:', res.data);
          setError('Invalid data format received from server');
          setMessages([]);
        }

        // If there's a message ID in the URL, select that message
        const messageId = searchParams.get('id');
        if (messageId) {
          const message = messagesArray.find(m => m._id === messageId);
          if (message) {
            setSelectedMessage(message);
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to fetch messages. Please try again.');
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [searchParams]);

  // Add a refresh button to manually fetch messages
  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Refreshing messages...');
      const res = await axios.get('/api/contact');
      console.log('Refresh response:', res.data);

      // Handle both array and object responses
      const messagesArray = Array.isArray(res.data) ? res.data : res.data.messages;

      if (Array.isArray(messagesArray)) {
        setMessages(messagesArray);
        setSuccessMessage('Messages refreshed successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('Invalid messages data format:', res.data);
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

  // Removed handleStatusUpdate and handleReply functions

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

  if (loading) {
    return (
      <div className="admin-messages">
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="admin-messages">
      <div className="messages-header">
        <h1>Contact <span className="highlight">Messages</span></h1>
        <p>Manage contact form submissions</p>
        <button className="back-button" onClick={() => navigate('/admin')}>
          Back to Dashboard
        </button>
        <button className="refresh-button" onClick={handleRefresh}>
          Refresh Messages
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="messages-container">
        <div className="messages-list">
          <h2>All Messages ({messages.length})</h2>
          <div className="message-cards">
            {messages.length > 0 ? (
              messages.map(message => (
                <div
                  key={message._id}
                  className={`message-card ${selectedMessage?._id === message._id ? 'selected' : ''}`}
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="message-header">
                    <h3>{message.subject || 'No Subject'}</h3>
                  </div>
                  <p className="message-preview">
                    {message.message ? message.message.substring(0, 100) + '...' : 'No message content'}
                  </p>
                  <div className="message-footer">
                    <span className="sender">
                      {message.name || 'Anonymous'} ({message.email || 'No email'})
                    </span>
                    <span className="date">
                      {message.createdAt ? new Date(message.createdAt).toLocaleDateString() : 'No date'}
                    </span>
                  </div>
                  <div className="message-actions-quick">
                    <button
                      className="delete-button-quick"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMessage(message._id);
                      }}
                      title="Delete message"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-messages">
                No messages found in the database
              </div>
            )}
          </div>
        </div>

        <div className="message-detail">
          {selectedMessage ? (
            <>
              <div className="message-header">
                <h2>{selectedMessage.subject}</h2>
                <div className="message-actions">
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteMessage(selectedMessage._id)}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>

              <div className="message-info">
                <p><strong>From:</strong> {selectedMessage.name} ({selectedMessage.email})</p>
                <p><strong>Date:</strong> {new Date(selectedMessage.createdAt).toLocaleString()}</p>
              </div>

              <div className="message-content">
                <p>{selectedMessage.message}</p>
              </div>
            </>
          ) : (
            <div className="no-message-selected">
              <h2>Select a message to view details</h2>
              <p>Click on any message from the list to view its contents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminContactMessages;