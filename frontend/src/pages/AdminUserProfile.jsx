import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './Profile.css'; // Reusing the profile styles

function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user: adminUser } = useContext(AuthContext);

  const [user, setUser] = useState(null);
  const [solvedChallenges, setSolvedChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blockingUser, setBlockingUser] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (adminUser && adminUser.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, adminUser, navigate]);

  // Fetch user data and solved challenges
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching user data for ID:', id);

        // Fetch user details
        const userRes = await axios.get(`/api/auth/users/${id}`);
        setUser(userRes.data.user);

        // Fetch solved challenges
        if (userRes.data.user.solvedChallenges?.length > 0) {
          console.log('Fetching solved challenges...');
          const challenges = [];
          for (const challengeId of userRes.data.user.solvedChallenges) {
            const challengeRes = await axios.get(
              `/api/challenges/${challengeId}`
            );
            challenges.push(challengeRes.data.data);
          }
          setSolvedChallenges(challenges);
          console.log('Solved challenges loaded:', challenges.length);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err.response?.data?.message || 'Failed to fetch user data');
        setLoading(false);
      }
    };

    if (isAuthenticated && adminUser?.role === 'admin') {
      fetchUserData();
    }
  }, [id, isAuthenticated, adminUser]);

  const handleToggleBlockUser = async () => {
    if (!user) return;

    const isBlocking = !user.isBlocked;

    if (isBlocking && !blockReason.trim()) {
      setError('Please provide a reason for blocking this user');
      return;
    }

    setBlockingUser(true);
    setError(null);

    try {
      const response = await axios.put(
        `/api/auth/users/${user._id}/block`,
        {
          isBlocked: isBlocking,
          reason: isBlocking ? blockReason : null
        }
      );

      setUser(response.data.user || response.data.data || {
        ...user,
        isBlocked: isBlocking,
        blockedReason: isBlocking ? blockReason : null
      });
      setShowBlockForm(false);
      setBlockReason('');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isBlocking ? 'block' : 'unblock'} user`);
    } finally {
      setBlockingUser(false);
    }
  };

  if (!isAuthenticated || (adminUser && adminUser.role !== 'admin')) {
    return (
      <div className="profile-container">
        <div className="error">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading user profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error">{error}</div>
        <button
          className="back-button"
          onClick={() => navigate('/admin')}
        >
          ← Back to Admin Dashboard
        </button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="error">User not found</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <button
        className="back-button"
        onClick={() => navigate('/admin')}
      >
        ← Back to Admin Dashboard
      </button>

      <div className="profile-header">
        <div className="profile-avatar">{user.username.charAt(0).toUpperCase()}</div>
        <h1>{user.username}</h1>
        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{user.points}</span>
            <span className="stat-label">Points</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.solvedChallenges?.length || 0}</span>
            <span className="stat-label">Challenges Solved</span>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2>User Details</h2>
        <div className="user-details">
          <div className="detail-item">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{user.email}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Role:</span>
            <span className="detail-value">{user.role}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Joined:</span>
            <span className="detail-value">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className={`detail-value ${user.isBlocked ? 'blocked' : 'active'}`}>
              {user.isBlocked ? '🔒 Blocked' : '✓ Active'}
            </span>
          </div>
          {user.isBlocked && user.blockedReason && (
            <div className="detail-item">
              <span className="detail-label">Block Reason:</span>
              <span className="detail-value">{user.blockedReason}</span>
            </div>
          )}
        </div>
      </div>

      <div className="profile-section">
        <h2>Actions</h2>
        {error && <div className="error-message" style={{marginBottom: '1rem'}}>{error}</div>}
        
        {!showBlockForm ? (
          <button
            className={`admin-action-button ${user.isBlocked ? 'unblock' : 'block'}`}
            onClick={() => {
              if (user.isBlocked) {
                handleToggleBlockUser();
              } else {
                setShowBlockForm(true);
              }
            }}
            disabled={blockingUser}
            style={{
              marginRight: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {blockingUser ? 'Processing...' : user.isBlocked ? 'Unblock User' : 'Block User'}
          </button>
        ) : (
          <div style={{
            border: '1px solid #ff6b6b',
            padding: '1rem',
            borderRadius: '4px',
            backgroundColor: '#fff5f5'
          }}>
            <h3>Block User</h3>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Enter reason for blocking this user..."
              style={{
                width: '100%',
                padding: '0.5rem',
                marginBottom: '1rem',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'monospace',
                minHeight: '100px'
              }}
            />
            <div>
              <button
                onClick={handleToggleBlockUser}
                disabled={blockingUser || !blockReason.trim()}
                style={{
                  backgroundColor: '#ff6b6b',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  marginRight: '0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {blockingUser ? 'Blocking...' : 'Confirm Block'}
              </button>
              <button
                onClick={() => {
                  setShowBlockForm(false);
                  setBlockReason('');
                }}
                style={{
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="profile-section">
        <h2>Solved Challenges</h2>
        {solvedChallenges.length > 0 ? (
          <div className="solved-challenges">
            {solvedChallenges.map(challenge => (
              <div key={challenge._id} className="solved-challenge-card">
                <div className="challenge-info">
                  <h3>{challenge.title}</h3>
                  <div className="challenge-meta">
                    <span className={`difficulty ${challenge.difficulty.toLowerCase()}`}>
                      {challenge.difficulty}
                    </span>
                    <span className="category">{challenge.category}</span>
                    <span className="points">{challenge.points} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-challenges">
            <p>This user hasn't solved any challenges yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUserProfile;