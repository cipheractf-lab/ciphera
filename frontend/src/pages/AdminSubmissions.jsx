import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flag, Search, ChevronLeft, TrendingUp, Users, CheckCircle, XCircle,
  Award, Clock, Shield, Mail, MapPin, AlertTriangle
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import './AdminSubmissions.css';

function AdminSubmissions() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/analytics/challenge-submissions');
      setChallenges(res.data.data);
    } catch (err) {
      setError('Failed to fetch challenge submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionDetails = async (challengeId) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/analytics/challenge-submissions/${challengeId}`);
      setSubmissionDetails(res.data.data);
      setSelectedChallenge(challengeId);
    } catch (err) {
      setError('Failed to fetch submission details');
    } finally {
      setLoading(false);
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
      second: '2-digit',
      hour12: true
    });
  };

  const filteredChallenges = challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    challenge.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !challenges.length && !submissionDetails) {
    return (
      <div className="htb-submissions-container">
        <div className="htb-submissions-grid-bg"></div>
        <div className="htb-submissions-orb htb-submissions-orb--primary" aria-hidden="true" />
        <div className="htb-submissions-orb htb-submissions-orb--secondary" aria-hidden="true" />
        <div className="htb-submissions-orb htb-submissions-orb--tertiary" aria-hidden="true" />
        <Loading text="LOADING SUBMISSIONS..." />
      </div>
    );
  }

  return (
    <div className="htb-submissions-container">
      <div className="htb-submissions-grid-bg"></div>
      <div className="htb-submissions-orb htb-submissions-orb--primary" aria-hidden="true" />
      <div className="htb-submissions-orb htb-submissions-orb--secondary" aria-hidden="true" />
      <div className="htb-submissions-orb htb-submissions-orb--tertiary" aria-hidden="true" />

      {!selectedChallenge && (
        <motion.div 
          className="htb-submissions-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="htb-submissions-title-section">
            <h1 className="htb-submissions-title">
              <Flag size={32} />
              CHALLENGE <span className="htb-text-primary">SUBMISSIONS</span>
            </h1>
            <p className="htb-submissions-subtitle">Monitor challenge submission statistics and user attempts</p>
          </div>
          <button className="htb-back-btn" onClick={() => navigate('/admin')}>
            <ChevronLeft size={18} /> Back to Dashboard
          </button>
        </motion.div>
      )}

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
      </AnimatePresence>

      {!selectedChallenge ? (
        <>
          {/* Search Bar */}
          <motion.div 
            className="htb-search-section"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="htb-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search challenges by title or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Challenges Grid */}
          <motion.div 
            className="htb-challenges-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {filteredChallenges.map((challenge, idx) => (
              <div key={challenge._id} className="htb-challenge-card-shell">
                <GlowingEffect
                  spread={34}
                  glow={true}
                  disabled={false}
                  proximity={86}
                  inactiveZone={0.16}
                  borderWidth={2}
                />

                <motion.div
                  className="htb-challenge-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => fetchSubmissionDetails(challenge._id)}
                >
                  <div className="htb-challenge-card-header">
                    <h3>{challenge.title}</h3>
                    <div className="htb-challenge-badges">
                      <span className={`htb-difficulty-badge ${challenge.difficulty.toLowerCase()}`}>
                        {challenge.difficulty}
                      </span>
                      <span className="htb-category-badge">{challenge.category}</span>
                      <span className="htb-points-badge">
                        <Award size={14} /> {challenge.points}
                      </span>
                    </div>
                  </div>

                  <div className="htb-submission-stats">
                    <div className="htb-stat-item">
                      <Flag size={16} />
                      <div className="htb-stat-content">
                        <span className="htb-stat-value">{challenge.totalSubmissions}</span>
                        <span className="htb-stat-label">Total</span>
                      </div>
                    </div>
                    <div className="htb-stat-item success">
                      <CheckCircle size={16} />
                      <div className="htb-stat-content">
                        <span className="htb-stat-value">{challenge.successfulSubmissions}</span>
                        <span className="htb-stat-label">Success</span>
                      </div>
                    </div>
                    <div className="htb-stat-item failed">
                      <XCircle size={16} />
                      <div className="htb-stat-content">
                        <span className="htb-stat-value">{challenge.failedSubmissions}</span>
                        <span className="htb-stat-label">Failed</span>
                      </div>
                    </div>
                    <div className="htb-stat-item rate">
                      <TrendingUp size={16} />
                      <div className="htb-stat-content">
                        <span className="htb-stat-value">{challenge.successRate}%</span>
                        <span className="htb-stat-label">Rate</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            ))}
          </motion.div>

          {filteredChallenges.length === 0 && (
            <div className="htb-empty-state">
              <Flag size={48} className="htb-empty-icon" />
              <p>No challenges found</p>
              <span className="htb-empty-subtitle">Try adjusting your search terms</span>
            </div>
          )}
        </>
      ) : (
        <motion.div 
          className="htb-submission-details"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Details Header */}
          <div className="htb-details-header">
            <button 
              className="htb-back-btn" 
              onClick={() => {
                setSelectedChallenge(null);
                setSubmissionDetails(null);
              }}
            >
              <ChevronLeft size={18} /> Back to Challenges
            </button>
            <div className="htb-challenge-title">
              <h2>{submissionDetails?.challenge.title}</h2>
              <div className="htb-challenge-badges">
                <span className={`htb-difficulty-badge ${submissionDetails?.challenge.difficulty.toLowerCase()}`}>
                  {submissionDetails?.challenge.difficulty}
                </span>
                <span className="htb-category-badge">{submissionDetails?.challenge.category}</span>
                <span className="htb-points-badge">
                  <Award size={14} /> {submissionDetails?.challenge.points}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="htb-summary-stats">
            <div className="htb-stat-card">
              <Flag className="htb-stat-icon" size={24} />
              <div className="htb-stat-content">
                <span className="htb-stat-label">Total Attempts</span>
                <span className="htb-stat-value">{submissionDetails?.summary.totalSubmissions}</span>
              </div>
            </div>
            <div className="htb-stat-card success">
              <CheckCircle className="htb-stat-icon" size={24} />
              <div className="htb-stat-content">
                <span className="htb-stat-label">Successful</span>
                <span className="htb-stat-value">{submissionDetails?.summary.successfulSubmissions}</span>
              </div>
            </div>
            <div className="htb-stat-card failed">
              <XCircle className="htb-stat-icon" size={24} />
              <div className="htb-stat-content">
                <span className="htb-stat-label">Failed</span>
                <span className="htb-stat-value">{submissionDetails?.summary.failedSubmissions}</span>
              </div>
            </div>
            <div className="htb-stat-card rate">
              <TrendingUp className="htb-stat-icon" size={24} />
              <div className="htb-stat-content">
                <span className="htb-stat-label">Success Rate</span>
                <span className="htb-stat-value">{submissionDetails?.summary.successRate}%</span>
              </div>
            </div>
          </div>

          {/* Submissions Tables */}
          <div className="htb-submissions-tables">
            {/* Successful Submissions */}
            <div className="htb-submissions-section success">
              <h3>
                <CheckCircle size={20} />
                Successful Submissions ({submissionDetails?.successfulSubmissions.length})
              </h3>
              <div className="htb-table-container">
                <table className="htb-submissions-table">
                  <thead>
                    <tr>
                      <th><Users size={16} /> User</th>
                      <th><Mail size={16} /> Email</th>
                      <th><Flag size={16} /> Flag</th>
                      <th><Award size={16} /> Points</th>
                      <th><Clock size={16} /> Submitted At</th>
                      <th><MapPin size={16} /> IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionDetails?.successfulSubmissions.map((sub, index) => (
                      <tr key={index} className="success-row">
                        <td>{sub.username}</td>
                        <td>{sub.email}</td>
                        <td className="flag-text">{sub.submittedFlag}</td>
                        <td className="points-cell">{sub.points}</td>
                        <td>{formatDate(sub.submittedAt)}</td>
                        <td className="ip-address">{sub.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Failed Submissions */}
            <div className="htb-submissions-section failed">
              <h3>
                <XCircle size={20} />
                Failed Submissions ({submissionDetails?.failedSubmissions.length})
              </h3>
              <div className="htb-table-container">
                <table className="htb-submissions-table">
                  <thead>
                    <tr>
                      <th><Users size={16} /> User</th>
                      <th><Mail size={16} /> Email</th>
                      <th><Flag size={16} /> Attempted Flag</th>
                      <th><Clock size={16} /> Submitted At</th>
                      <th><MapPin size={16} /> IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionDetails?.failedSubmissions.map((sub, index) => (
                      <tr key={index} className="failed-row">
                        <td>{sub.username}</td>
                        <td>{sub.email}</td>
                        <td className="flag-text">{sub.submittedFlag}</td>
                        <td>{formatDate(sub.submittedAt)}</td>
                        <td className="ip-address">{sub.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default AdminSubmissions;
