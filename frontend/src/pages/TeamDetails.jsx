import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Users, Award, Trophy, Zap, Crown, Lock, Shield } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './TeamDetails.css';

function TeamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTeamDetails = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      try {
        // Cookie sent automatically
        const res = await axios.get(`/api/teams/${id}`);
        setTeam(res.data.data);
        console.log('Team data loaded:', res.data.data);
        console.log('Team members unlockedHints:', res.data.data.members.map(m => ({
          username: m.username,
          unlockedHints: m.unlockedHints
        })));
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError(err.response?.data?.message || 'Failed to load team details');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamDetails();
  }, [id, isAuthenticated, authLoading, navigate]);

  // Show loading only after auth is done
  if (authLoading || loading) {
    return (
      <div className="htb-team-container">
        <div className="htb-team-grid-bg"></div>
        <Loading text="LOADING TEAM..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="htb-team-container">
        <div className="htb-team-grid-bg"></div>
        <motion.div 
          className="htb-error-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>{error}</p>
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

  if (!team) {
    return (
      <div className="htb-team-container">
        <div className="htb-team-grid-bg"></div>
        <motion.div 
          className="htb-error-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p>Team not found</p>
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

  // Sort members by points (highest first)
  const sortedMembers = [...team.members].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Captain is either from the database (already populated) or defaults to highest scorer
  let captain = null;
  if (team.captain) {
    // If captain is populated as an object with _id
    if (typeof team.captain === 'object' && team.captain._id) {
      captain = team.captain;
    } else {
      // If captain is just an ID string, find it in members
      captain = team.members.find(m => m._id === team.captain || m._id.toString() === team.captain.toString());
    }
  }
  // If no captain set, default to highest scorer
  if (!captain) {
    captain = sortedMembers[0];
  }

  return (
    <div className="htb-team-container">
      <div className="htb-team-grid-bg"></div>
      
      <motion.div 
        className="htb-team-header"
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
        <h1 className="htb-team-name">{team.name}</h1>
      </motion.div>

      <div className="htb-team-main">
        <motion.div 
          className="htb-team-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div 
            className="htb-stat-card htb-stat-points"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Trophy size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Total Points</div>
              <div className="htb-stat-value">{team.points || 0}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card htb-stat-members"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Users size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Team Members</div>
              <div className="htb-stat-value">{team.members.length}</div>
            </div>
          </motion.div>

          <motion.div 
            className="htb-stat-card htb-stat-challenges"
            whileHover={{ scale: 1.02, y: -4 }}
          >
            <div className="htb-stat-icon">
              <Award size={24} />
            </div>
            <div className="htb-stat-content">
              <div className="htb-stat-label">Challenges Solved</div>
              <div className="htb-stat-value">
                {team.members.reduce((sum, member) => sum + (member.personallySolvedChallenges?.length || 0), 0)}
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div 
          className="htb-team-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="htb-section-title">
            <span className="htb-title-line"></span>
            Team Members
          </h2>

          {captain && (
            <motion.div 
              className="htb-member-card htb-captain"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="htb-captain-badge">
                <Crown size={16} />
                <span>Captain</span>
              </div>
              <div 
                className="htb-member-info"
                onClick={() => navigate(`/user/${captain._id}`)}
              >
                <div className="htb-member-name">{captain.username}</div>
                <div className="htb-member-email">{captain.email}</div>
              </div>
              <div className="htb-member-stats">
                <div className="htb-member-stat">
                  <Zap size={16} />
                  <span>{captain.points || 0} pts</span>
                </div>
                <div className="htb-member-stat">
                  <Award size={16} />
                  <span>{captain.personallySolvedChallenges?.length || 0} solved</span>
                </div>
                <div className="htb-member-stat">
                  <Lock size={16} />
                  <span>{captain.unlockedHints?.length || 0} hints</span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="htb-members-grid">
            {sortedMembers.filter(m => m._id !== captain?._id).map((member, index) => (
              <motion.div 
                key={member._id}
                className="htb-member-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <div className="htb-member-rank">
                  <Shield size={18} />
                </div>
                <div 
                  className="htb-member-info"
                  onClick={() => navigate(`/user/${member._id}`)}
                >
                  <div className="htb-member-name">{member.username}</div>
                  <div className="htb-member-email">{member.email}</div>
                </div>
                <div className="htb-member-stats">
                  <div className="htb-member-stat">
                    <Zap size={16} />
                    <span>{member.points || 0} pts</span>
                  </div>
                  <div className="htb-member-stat">
                    <Award size={16} />
                    <span>{member.personallySolvedCount || member.personallySolvedChallenges?.length || 0} solved</span>
                  </div>
                  <div className="htb-member-stat">
                    <Lock size={16} />
                    <span>{member.unlockedHints?.length || 0} hints</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {team.members.length === 0 && (
            <div className="htb-empty-state">
              <Users size={48} />
              <p>No members in this team yet</p>
            </div>
          )}
        </motion.div>

        {team.members.some(m => m.unlockedHints && m.unlockedHints.length > 0) && (
          <motion.div 
            className="htb-team-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="htb-section-title">
              <span className="htb-title-line"></span>
              Unlocked Hints
            </h2>
            <div className="htb-hints-list">
              {team.members.map((member, memberIndex) => (
                member.unlockedHints && member.unlockedHints.length > 0 && (
                  <motion.div 
                    key={member._id}
                    className="htb-member-hints-group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + memberIndex * 0.1 }}
                  >
                    <div className="htb-member-hints-header">
                      <Users size={18} />
                      <span>{member.username}</span>
                    </div>
                    <div className="htb-hints-grid">
                      {member.unlockedHints.map((hint, idx) => (
                        <motion.div 
                          key={idx}
                          className="htb-hint-card"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + idx * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div className="htb-hint-challenge">
                            <span className="htb-hint-challenge-name">
                              {hint.challengeName || 'Unknown Challenge'}
                            </span>
                            <span className="htb-hint-index">
                              Hint #{hint.hintIndex + 1}
                            </span>
                          </div>
                          <div className="htb-hint-cost">
                            -{hint.cost || 0} pts
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default TeamDetails;
