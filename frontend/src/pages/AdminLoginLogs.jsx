import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Search, RefreshCw, Trash2, Play, Pause,
  CheckCircle, XCircle, Clock, User, Mail, Monitor,
  MapPin, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './AdminLoginLogs.css';

function AdminLoginLogs() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const res = await axios.get(`/api/auth/admin/login-logs?${params}`);

      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
      setTotalLogs(res.data.total);
    } catch (err) {
      console.error('Error fetching login logs:', err);
      setError('Failed to fetch login logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL login logs? This cannot be undone!')) {
      return;
    }

    try {
      const response = await axios.delete('/api/auth/admin/login-logs');
      fetchLogs();
      setSuccessMessage(response.data.message || 'All login logs cleared');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error clearing logs:', err);
      setError('Failed to clear logs');
      setTimeout(() => setError(null), 3000);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const successLogs = logs.filter(log => log.status === 'success').length;
  const failedLogs = logs.filter(log => log.status === 'failed').length;

  if (loading && logs.length === 0) {
    return (
      <div className="htb-logs-container">
        <div className="htb-logs-grid-bg"></div>
        <div className="htb-logs-orb htb-logs-orb--primary" aria-hidden="true" />
        <div className="htb-logs-orb htb-logs-orb--secondary" aria-hidden="true" />
        <div className="htb-logs-orb htb-logs-orb--tertiary" aria-hidden="true" />
        <Loading text="LOADING SECURITY LOGS..." />
      </div>
    );
  }

  return (
    <div className="htb-logs-container">
      <div className="htb-logs-grid-bg"></div>
      <div className="htb-logs-orb htb-logs-orb--primary" aria-hidden="true" />
      <div className="htb-logs-orb htb-logs-orb--secondary" aria-hidden="true" />
      <div className="htb-logs-orb htb-logs-orb--tertiary" aria-hidden="true" />

      <motion.div 
        className="htb-logs-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="htb-logs-title-section">
          <h1 className="htb-logs-title">
            <Shield size={32} />
            LOGIN <span className="htb-text-primary">LOGS</span>
          </h1>
          <p className="htb-logs-subtitle">Monitor authentication activities with real-time IP and device tracking</p>
        </div>
        <button className="htb-back-btn" onClick={() => navigate('/admin')}>
          <ChevronLeft size={18} /> Back to Dashboard
        </button>
      </motion.div>

      <AnimatePresence>
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
      </AnimatePresence>

      <motion.div 
        className="htb-logs-stats"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="htb-stat-card">
          <Clock className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Total Logs</span>
            <span className="htb-stat-value">{totalLogs}</span>
          </div>
        </div>
        <div className="htb-stat-card success">
          <CheckCircle className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Successful</span>
            <span className="htb-stat-value">{successLogs}</span>
          </div>
        </div>
        <div className="htb-stat-card failed">
          <XCircle className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Failed Attempts</span>
            <span className="htb-stat-value">{failedLogs}</span>
          </div>
        </div>
        <div className="htb-stat-card">
          <RefreshCw className={`htb-stat-icon ${autoRefresh ? 'spinning' : ''}`} size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Auto-Refresh</span>
            <span className="htb-stat-value">{autoRefresh ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="htb-logs-controls"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="htb-filters">
          <div className="htb-search-box">
            <Search size={18} />
            <input
              type="text"
              name="search"
              placeholder="Search by email or username..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="htb-filter-select"
          >
            <option value="">All Status</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
        <div className="htb-actions">
          <motion.button
            className="htb-btn-secondary"
            onClick={fetchLogs}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RefreshCw size={16} /> Refresh
          </motion.button>
          <motion.button
            className={`htb-btn-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {autoRefresh ? <Pause size={16} /> : <Play size={16} />}
            {autoRefresh ? 'Stop' : 'Start'} Auto-Refresh
          </motion.button>
          <motion.button
            className="htb-btn-danger"
            onClick={clearAllLogs}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 size={16} /> Clear All Logs
          </motion.button>
        </div>
      </motion.div>

      <motion.div 
        className="htb-logs-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="htb-table-container">
          <table className="htb-logs-table">
            <thead>
              <tr>
                <th><Clock size={16} /> Time</th>
                <th><User size={16} /> User</th>
                <th><Mail size={16} /> Email</th>
                <th><MapPin size={16} /> IP Address</th>
                <th><Monitor size={16} /> User Agent</th>
                <th>Status</th>
                <th>Failure Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <motion.tr 
                  key={log._id} 
                  className={`htb-log-row ${log.status}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <td className="htb-time">{formatDate(log.loginTime)}</td>
                  <td>
                    <div className="htb-user-info">
                      <span className="htb-username">{log.username}</span>
                      {log.user && (
                        <span className={`htb-role-badge htb-role-${log.user.role}`}>
                          {log.user.role}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="htb-email">{log.email}</td>
                  <td className="htb-ip" title={log.ipAddress}>
                    {log.ipAddress || 'Unknown'}
                  </td>
                  <td className="htb-user-agent" title={log.userAgent}>
                    {log.userAgent ? log.userAgent.substring(0, 50) + (log.userAgent.length > 50 ? '...' : '') : 'Unknown'}
                  </td>
                  <td>
                    <span className={`htb-status-badge ${log.status}`}>
                      {log.status === 'success' ? (
                        <><CheckCircle size={14} /> Success</>
                      ) : (
                        <><XCircle size={14} /> Failed</>
                      )}
                    </span>
                  </td>
                  <td>
                    {log.failureReason && (
                      <span className="htb-failure-reason">{log.failureReason}</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && !loading && (
          <div className="htb-empty-state">
            <Shield size={48} className="htb-empty-icon" />
            <p>No login logs found</p>
            <span className="htb-empty-subtitle">No login activities match your current filters</span>
          </div>
        )}

        {totalPages > 1 && (
          <div className="htb-pagination">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="htb-pagination-btn"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="htb-pagination-info">
              Page {page} of {totalPages} ({totalLogs} total logs)
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="htb-pagination-btn"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AdminLoginLogs;
