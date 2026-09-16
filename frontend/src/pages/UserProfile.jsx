import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Award, Trophy, Lock, Users, Flag, Medal } from 'lucide-react';
import { RadarChart } from '@mui/x-charts/RadarChart';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './UserProfile.css';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchUserProfile();
  }, [userId, isAuthenticated, navigate]);

  const fetchUserProfile = async () => {
    try {
      const [userRes, challengesRes] = await Promise.all([
        axios.get(`/api/auth/user/${userId}`),
        axios.get('/api/challenges')
      ]);

      setUser(userRes.data.user);
      setChallenges(challengesRes.data.data || []);
    } catch (err) {
      setError('Failed to fetch user profile');
    } finally {
      setLoading(false);
    }
  };

  const getSolvedChallenges = () => {
    // Backend now returns full challenge objects with details
    if (!user?.solvedChallenges || !Array.isArray(user.solvedChallenges)) return [];
    
    // If solvedChallenges already has challenge details, use them directly
    if (user.solvedChallenges.length > 0 && user.solvedChallenges[0].title) {
      return user.solvedChallenges;
    }
    
    // Fallback: if it's just IDs, filter from challenges list
    if (!challenges.length) return [];
    return challenges.filter(challenge => 
      user.solvedChallenges.includes(challenge._id)
    );
  };

  if (loading) {
    return (
      <div className="htb-user-container">
        <div className="htb-user-grid-bg"></div>
        <Loading text="LOADING USER..." />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="htb-user-container">
        <div className="htb-user-grid-bg"></div>
        <motion.div 
          className="htb-error-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>{error || 'User not found'}</p>
          <motion.button 
            className="htb-back-btn"
            onClick={() => navigate('/scoreboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronLeft size={20} />
            Back to Scoreboard
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const solvedChallenges = getSolvedChallenges();
  const categoryCounts = solvedChallenges.reduce((acc, challenge) => {
    const categoryName = (challenge?.category || 'Uncategorized').toString().trim() || 'Uncategorized';
    acc[categoryName] = (acc[categoryName] || 0) + 1;
    return acc;
  }, {});
  const radarMetrics = Object.keys(categoryCounts);
  const radarData = radarMetrics.map((metric) => categoryCounts[metric]);
  const radarMax = Math.max(1, ...radarData);

  return (
    <div className="htb-user-container">
      <div className="htb-user-grid-bg"></div>
      
      <motion.div 
        className="htb-user-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button 
          className="htb-back-btn"
          onClick={() => navigate('/scoreboard')}
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft size={20} />
          Back
        </motion.button>
        <h1 className="htb-user-name">{user.username}</h1>
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
            whileHover={{ scale: 1.02, y: -4 }}
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
            whileHover={{ scale: 1.02, y: -4 }}
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
            whileHover={{ scale: 1.02, y: -4 }}
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
            whileHover={{ scale: 1.02, y: -4 }}
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
            whileHover={{ scale: 1.02, y: -4 }}
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

        <motion.div
          className="htb-user-section htb-radar-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className="htb-section-title">
            <span className="htb-title-line"></span>
            Category Radar
          </h2>
          <div className="htb-radar-card">
            <div className="htb-radar-legend-custom">
              <span className="htb-radar-legend-dot" aria-hidden="true" />
              <span className="htb-radar-legend-name">{user.username || 'User'}</span>
            </div>
            {radarMetrics.length > 0 ? (
              <RadarChart
                height={300}
                series={[{ label: user.username || 'User', data: radarData, color: '#4f7cff' }]}
                radar={{
                  max: radarMax,
                  metrics: radarMetrics,
                }}
                sx={{
                  '& text': { fill: '#ffffff !important' },
                  '& .MuiChartsAxis-tickLabel': { fill: '#ffffff !important' },
                  '& .MuiChartsPolarAxis-tickLabel': { fill: '#ffffff !important' },
                  '& [class*="MuiRadarGrid"] line': { stroke: 'rgba(255, 255, 255, 0.45) !important' },
                  '& [class*="MuiRadarGrid"] path': { stroke: 'rgba(255, 255, 255, 0.45) !important' },
                  '& [class*="MuiRadarSeries"] path': { stroke: '#4f7cff !important' },
                  '& [class*="MuiRadarSeries"] circle': {
                    fill: '#4f7cff !important',
                    stroke: '#4f7cff !important',
                  },
                }}
              />
            ) : (
              <div className="htb-radar-empty">No solved category data available yet</div>
            )}
          </div>
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
                  whileHover={{ scale: 1.02 }}
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

export default UserProfile;