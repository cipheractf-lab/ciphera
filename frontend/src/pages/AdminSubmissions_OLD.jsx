import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './AdminDashboard.css';
import './AdminSubmissions.css';

function AdminSubmissions() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [submissionDetails, setSubmissionDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      const res = await axios.get(`/api/analytics/challenge-submissions/${challengeId}`);
      setSubmissionDetails(res.data.data);
      setSelectedChallenge(challengeId);
    } catch (err) {
      setError('Failed to fetch submission details');
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

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Challenge <span className="highlight">Submissions</span></h1>
          <p>Monitor challenge submission statistics and user attempts</p>
        </div>
        <button className="back-button" onClick={() => navigate('/admin')}>
          ← Back to Dashboard
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!selectedChallenge ? (
        <div className="submissions-overview">
          <h2>All Challenges</h2>
          <div className="challenges-grid">
            {challenges.map(challenge => (
              <div 
                key={challenge._id} 
                className="challenge-card clickable"
                onClick={() => fetchSubmissionDetails(challenge._id)}
              >
                <h3>{challenge.title}</h3>
                <div className="challenge-meta">
                  <span className={`difficulty-badge ${challenge.difficulty.toLowerCase()}`}>
                    {challenge.difficulty}
                  </span>
                  <span className="category-badge">{challenge.category}</span>
                  <span className="points-badge">{challenge.points} pts</span>
                </div>
                <div className="submission-stats">
                  <div className="stat">
                    <span className="stat-number">{challenge.totalSubmissions}</span>
                    <span className="stat-label">Total Attempts</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number success">{challenge.successfulSubmissions}</span>
                    <span className="stat-label">Successful</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number failed">{challenge.failedSubmissions}</span>
                    <span className="stat-label">Failed</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">{challenge.successRate}%</span>
                    <span className="stat-label">Success Rate</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="submission-details">
          <div className="details-header">
            <button 
              className="back-button" 
              onClick={() => {
                setSelectedChallenge(null);
                setSubmissionDetails(null);
              }}
            >
              ← Back to Challenges
            </button>
            <h2>{submissionDetails?.challenge.title}</h2>
            <div className="challenge-info">
              <span className={`difficulty-badge ${submissionDetails?.challenge.difficulty.toLowerCase()}`}>
                {submissionDetails?.challenge.difficulty}
              </span>
              <span className="category-badge">{submissionDetails?.challenge.category}</span>
              <span className="points-badge">{submissionDetails?.challenge.points} pts</span>
            </div>
          </div>

          <div className="submission-summary">
            <div className="summary-stats">
              <div className="stat-card">
                <span className="stat-number">{submissionDetails?.summary.totalSubmissions}</span>
                <span className="stat-label">Total Attempts</span>
              </div>
              <div className="stat-card success">
                <span className="stat-number">{submissionDetails?.summary.successfulSubmissions}</span>
                <span className="stat-label">Successful</span>
              </div>
              <div className="stat-card failed">
                <span className="stat-number">{submissionDetails?.summary.failedSubmissions}</span>
                <span className="stat-label">Failed</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{submissionDetails?.summary.successRate}%</span>
                <span className="stat-label">Success Rate</span>
              </div>
            </div>
          </div>

          <div className="submissions-sections">
            <div className="successful-submissions">
              <h3>Successful Submissions ({submissionDetails?.successfulSubmissions.length})</h3>
              <div className="submissions-table">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Flag</th>
                      <th>Points Earned</th>
                      <th>Submitted At</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionDetails?.successfulSubmissions.map((sub, index) => (
                      <tr key={index} className="success-row">
                        <td>{sub.username}</td>
                        <td>{sub.email}</td>
                        <td className="flag-text">{sub.submittedFlag}</td>
                        <td className="points">{sub.points}</td>
                        <td>{formatDate(sub.submittedAt)}</td>
                        <td className="ip-address">{sub.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="failed-submissions">
              <h3>Failed Submissions ({submissionDetails?.failedSubmissions.length})</h3>
              <div className="submissions-table">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Attempted Flag</th>
                      <th>Submitted At</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionDetails?.failedSubmissions.map((sub, index) => (
                      <tr key={index} className="failed-row">
                        <td>{sub.username}</td>
                        <td>{sub.email}</td>
                        <td className="flag-text failed">{sub.submittedFlag}</td>
                        <td>{formatDate(sub.submittedAt)}</td>
                        <td className="ip-address">{sub.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSubmissions;