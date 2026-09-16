import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Trophy, Lock, Users, Flag, Medal, Mail } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './UserProfile.css';

function Profile() {
  const { user: authUser, isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      return;
    }
    if (!authLoading && isAuthenticated && authUser) {
      fetchUserProfile();
    }
  }, [authLoading, isAuthenticated, authUser]);

  const fetchUserProfile = async () => {
    try {
      const [userRes, challengesRes] = await Promise.all([
        axios.get('/api/auth/me'),
        axios.get('/api/challenges')
      ]);

      setUser(userRes.data.user);
      setChallenges(challengesRes.data.data || []);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const getSolvedChallenges = () => {
    if (!user?.solvedChallenges || !Array.isArray(user.solvedChallenges)) return [];
    
    // If solvedChallenges already has challenge details, use them directly
    if (user.solvedChallenges.length > 0 && user.solvedChallenges[0]?.title) {
      return user.solvedChallenges;
    }
    
    // Fallback: if it's just IDs, filter from challenges list
    if (!challenges.length) return [];
    return challenges.filter(challenge => 
      user.solvedChallenges.includes(challenge._id)
    );
  };

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="htb-user-container htb-user-container--profile">
        <div className="htb-user-grid-bg"></div>
        <Loading text="LOADING PROFILE..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="htb-user-container htb-user-container--profile">
        <div className="htb-user-grid-bg"></div>
        <motion.div 
          className="htb-error-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>{error || 'Failed to load profile'}</p>
        </motion.div>
      </div>
    );
  }

  const solvedChallenges = getSolvedChallenges();

  return (
    <div className="htb-user-container htb-user-container--profile">
      <div className="htb-user-grid-bg"></div>
      
      <motion.div 
        className="htb-user-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="htb-user-info">
          <h1 className="htb-user-name">{user.username}</h1>
          <div className="htb-user-email">
            <Mail size={16} />
            <span>{user.email}</span>
          </div>
        </div>
      </motion.div>

      <div className="htb-user-main">
        <motion.div 
          className="htb-user-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="htb-stat-card"
          >
            <div className="htb-stat-icon">
              <Trophy size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Total Points</div>
              <div className="htb-stat-value">{user.points || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
          >
            <div className="htb-stat-icon">
              <Flag size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Challenges Solved</div>
              <div className="htb-stat-value">{user.challengesSolvedCount || user.solvedChallenges?.length || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
          >
            <div className="htb-stat-icon">
              <Medal size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Rank</div>
              <div className="htb-stat-value">#{user.rank || '-'}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
          >
            <div className="htb-stat-icon">
              <Lock size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Hints Unlocked</div>
              <div className="htb-stat-value">{user.unlockedHints?.length || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card"
          >
            <div className="htb-stat-icon">
              <Users size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Team</div>
              <div className="htb-stat-value htb-stat-team">
                {user.team?.name || 'No Team'}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="htb-user-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="htb-section-title">
            <span className="htb-title-line"></span>
            Solved Challenges ({solvedChallenges.length})
          </h2>
          {solvedChallenges.length > 0 ? (
            <div className="htb-challenges-grid">
              {solvedChallenges.map((challenge, index) => (
                <motion.div 
                  key={challenge._id}
                  className="htb-challenge-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <h3 className="htb-challenge-title">{challenge.title}</h3>
                  <div className="htb-challenge-meta">
                    <span className="htb-category">{challenge.category}</span>
                    <span className="htb-points">
                      <Award size={14} />
                      {challenge.points} pts
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="htb-empty-state">
              <Flag size={48} />
              <p>No challenges solved yet</p>
            </div>
          )}
        </motion.div>

        {user.unlockedHints && user.unlockedHints.length > 0 && (
          <motion.div 
            className="htb-user-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="htb-section-title">
              <span className="htb-title-line"></span>
              Unlocked Hints ({user.unlockedHints.length})
            </h2>
            <div className="htb-hints-grid">
              {user.unlockedHints.map((hint, idx) => (
                <motion.div 
                  key={idx}
                  className="htb-hint-card"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                >
                  <div className="htb-hint-header">
                    <Lock size={18} />
                    <div className="htb-hint-info">
                      <h3>{hint.challengeName || 'Unknown Challenge'}</h3>
                      <span className="htb-hint-index">Hint #{hint.hintIndex + 1}</span>
                    </div>
                  </div>
                  <div className="htb-hint-meta">
                    <span className="htb-hint-cost">-{hint.cost || 0} pts</span>
                    <span className="htb-hint-date">
                      {new Date(hint.unlockedAt).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Profile;
