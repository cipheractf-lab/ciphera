import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, XCircle, Radio, AlertCircle, Users, Trophy, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminLiveMonitor.css';

const AdminLiveMonitor = () => {
  const [submissions, setSubmissions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0 });
  const { user } = useAuth();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!user) {
      console.log('Waiting for user authentication...');
      setConnectionStatus('error');
      return;
    }

    const sseUrl = `/api/r-submission`;
    console.log('Connecting to SSE (auth via cookies)');

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(sseUrl, {
      withCredentials: true
    });
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE Connected');
      setConnectionStatus('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE Message:', data);

        if (data.type === 'connected') {
          return;
        }

        setSubmissions(prev => {
          const newSubmissions = [data, ...prev];
          if (newSubmissions.length > 50) {
            return newSubmissions.slice(0, 50);
          }
          return newSubmissions;
        });

        setStats(prev => {
          const isFailed = data.type === 'failed_attempt' || data.status === 'incorrect';
          return {
            total: prev.total + 1,
            success: isFailed ? prev.success : prev.success + 1,
            failed: isFailed ? prev.failed + 1 : prev.failed
          };
        });
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setConnectionStatus('error');
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [user]);

  // Calculate unique active users based on email
  const activeUsers = [...new Set(submissions.map(sub => sub.email))].length;

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return { icon: Radio, label: 'LIVE', color: 'success' };
      case 'connecting':
        return { icon: Activity, label: 'CONNECTING', color: 'warning' };
      default:
        return { icon: AlertCircle, label: 'DISCONNECTED', color: 'error' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="htb-monitor-container">
      <div className="htb-monitor-grid-bg"></div>
      <div className="htb-monitor-orb htb-monitor-orb--primary" aria-hidden="true" />
      <div className="htb-monitor-orb htb-monitor-orb--secondary" aria-hidden="true" />
      <div className="htb-monitor-orb htb-monitor-orb--tertiary" aria-hidden="true" />

      <motion.div 
        className="htb-monitor-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="htb-monitor-title-section">
          <h1 className="htb-monitor-title">
            <Activity size={32} />
            LIVE <span className="htb-text-primary">MONITOR</span>
          </h1>
          <p className="htb-monitor-subtitle">Real-time flag submission tracking</p>
        </div>
        <motion.div className={`htb-status-badge htb-status-${statusConfig.color}`}>
          <StatusIcon size={18} />
          {statusConfig.label}
        </motion.div>
      </motion.div>

      <motion.div 
        className="htb-monitor-stats"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="htb-stat-card">
          <Trophy className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Total Submissions</span>
            <span className="htb-stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="htb-stat-card success">
          <CheckCircle className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Successful</span>
            <span className="htb-stat-value">{stats.success}</span>
          </div>
        </div>
        <div className="htb-stat-card failed">
          <XCircle className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Failed</span>
            <span className="htb-stat-value">{stats.failed}</span>
          </div>
        </div>
        <div className="htb-stat-card">
          <Users className="htb-stat-icon" size={24} />
          <div className="htb-stat-content">
            <span className="htb-stat-label">Active Users</span>
            <span className="htb-stat-value">{activeUsers}</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {connectionStatus === 'error' && (
          <motion.div 
            className="htb-alert htb-alert-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle size={18} />
            Connection failed. Check console for details or refresh the page.
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className="htb-monitor-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="htb-table-container">
          <table className="htb-monitor-table">
            <thead>
              <tr>
                <th><Clock size={16} /> Time</th>
                <th><Users size={16} /> User</th>
                <th>Email</th>
                <th><Trophy size={16} /> Challenge</th>
                <th>Flag</th>
                <th>Points</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {submissions.length === 0 ? (
                  <tr className="htb-empty-row">
                    <td colSpan="8">
                      <div className="htb-empty-state">
                        <Activity size={48} className="htb-empty-icon" />
                        <p>Waiting for submissions...</p>
                        <span className="htb-empty-subtitle">Flag submissions will appear here in real-time</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub, index) => {
                    const isFailed = sub.type === 'failed_attempt' || sub.status === 'incorrect';
                    return (
                      <motion.tr 
                        key={`${sub.user}-${sub.submittedAt}-${index}`}
                        className={`htb-submission-row ${isFailed ? 'failed' : 'success'}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <td className="htb-time">
                          {new Date(sub.submittedAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="htb-username">{sub.user}</td>
                        <td className="htb-email">{sub.email}</td>
                        <td className="htb-challenge">{sub.challenge}</td>
                        <td className="htb-flag">{sub.submittedFlag || 'N/A'}</td>
                        <td className="htb-points">
                          <span className={`htb-points-badge ${isFailed ? 'failed' : 'success'}`}>
                            {isFailed ? '0' : sub.points}
                          </span>
                        </td>
                        <td className="htb-ip">{sub.ip}</td>
                        <td className="htb-status">
                          <span className={`htb-status-indicator ${isFailed ? 'failed' : 'success'}`}>
                            {isFailed ? <XCircle size={16} /> : <CheckCircle size={16} />}
                            {isFailed ? 'Failed' : 'Success'}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {submissions.length > 0 && (
          <div className="htb-monitor-footer">
            <span className="htb-footer-text">
              Showing last {submissions.length} submissions (max 50)
            </span>
            <span className="htb-footer-text htb-text-muted">
              Auto-refreshes in real-time via Server-Sent Events
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminLiveMonitor;
