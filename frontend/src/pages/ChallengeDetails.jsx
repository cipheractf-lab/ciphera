import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Award, Users, Lock, Unlock, Flag, AlertCircle, CheckCircle2, Send, X } from 'lucide-react'
import axios from 'axios'
import AuthContext from '../context/AuthContext'
import { Loading } from '../components/ui'
import './ChallengeDetails.css'

// Set default axios timeout for this component
axios.defaults.timeout = 15000; // 15 seconds

const SolvesModal = ({ challenge, onClose }) => {
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const res = await axios.get(`/api/challenges/${challenge._id}/solves`);
        setSolves(res.data.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching solves:', err);
        setLoading(false);
      }
    };

    fetchSolves();
  }, [challenge._id]);

  return (
    <AnimatePresence>
      <motion.div 
        className="htb-modal-overlay" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="htb-modal-content" 
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="htb-modal-header">
            <div className="htb-modal-title">
              <Users size={24} />
              <h3>{challenge.title} - Solves ({solves.length})</h3>
            </div>
            <motion.button 
              className="htb-modal-close" 
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>

          <div className="htb-modal-body">
            {loading ? (
              <Loading text="LOADING SOLVES..." />
            ) : solves.length === 0 ? (
              <div className="htb-no-solves">No one has solved this challenge yet!</div>
            ) : (
              <div className="htb-solves-list">
                <table className="htb-solves-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Team</th>
                      <th>Solved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solves.map((solve, index) => (
                      <motion.tr 
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td>{index + 1}</td>
                        <td>{solve.username}</td>
                        <td>{solve.team}</td>
                        <td>{new Date(solve.solvedAt).toLocaleString()}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const FlagSubmissionModal = ({ challenge, onClose, onSubmit }) => {
  const [flag, setFlag] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!flag.trim()) {
      setError('Please enter a flag');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await onSubmit(flag);
      setSuccess('Correct flag!');
      setTimeout(() => {
        onClose();
        window.location.reload(); // Force refresh to update UI
      }, 1500);
    } catch (err) {
      setError(err.message || 'Incorrect flag');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="htb-modal-overlay" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="htb-modal-content" 
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="htb-modal-header">
            <div className="htb-modal-title">
              <Flag size={24} />
              <h3>Submit Flag:</h3>
            </div>
            
            <AnimatePresence>
              {(error || success) && (
                <div className="htb-modal-status">
                  {error && (
                    <motion.div 
                      className="htb-status-badge htb-status-error"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AlertCircle size={16} />
                      {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div 
                      className="htb-status-badge htb-status-success"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle2 size={16} />
                      {success}
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
            
            <motion.button 
              className="htb-modal-close" 
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>

          <div className="htb-modal-body">

            <form onSubmit={handleSubmit} className="htb-flag-form">
              <div className="htb-form-group">
                <label htmlFor="flag">Flag</label>
                <div className="htb-input-wrapper">
                  <input
                    type="text"
                    id="flag"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    placeholder="SECE{flag_here}"
                    autoComplete="off"
                    disabled={isSubmitting || success}
                    className="htb-flag-input"
                  />
                  <div className="htb-input-border"></div>
                </div>
              </div>

              <motion.button
                type="submit"
                className="htb-submit-flag-btn"
                disabled={isSubmitting || success}
                whileHover={!isSubmitting && !success ? { scale: 1.05 } : {}}
                whileTap={!isSubmitting && !success ? { scale: 0.95 } : {}}
              >
                {isSubmitting ? (
                  <>
                    <span className="htb-spinner"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Flag
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const HintUnlockModal = ({ hint, hintIndex, teamPoints, pointsType, onClose, onConfirm }) => {
  const pointsAfter = teamPoints - hint.cost;
  const pointsLabel = pointsType === 'team' ? 'Team Points' : 'Your Points';

  return (
    <AnimatePresence>
      <motion.div 
        className="htb-modal-overlay" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="htb-modal-content htb-confirm-modal" 
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="htb-modal-header">
            <div className="htb-modal-title">
              <Lock size={24} />
              <h3>Unlock Hint</h3>
            </div>
            <motion.button 
              className="htb-modal-close" 
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={24} />
            </motion.button>
          </div>

          <div className="htb-modal-body">
            <div className="htb-unlock-confirm-content">
              <p className="htb-unlock-message">Are you sure you want to unlock this hint?</p>
              
              <div className="htb-unlock-stats">
                <div className="htb-unlock-stat">
                  <span className="htb-unlock-label">Hint Cost:</span>
                  <span className="htb-unlock-value htb-cost">{hint.cost} points</span>
                </div>
                <div className="htb-unlock-stat">
                  <span className="htb-unlock-label">{pointsLabel}:</span>
                  <span className="htb-unlock-value">{teamPoints} points</span>
                </div>
                <div className="htb-unlock-stat">
                  <span className="htb-unlock-label">After Unlock:</span>
                  <span className="htb-unlock-value htb-after">{pointsAfter} points</span>
                </div>
              </div>

              <div className="htb-unlock-actions">
                <motion.button
                  className="htb-btn htb-btn-secondary"
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="htb-btn htb-btn-primary"
                  onClick={onConfirm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Unlock size={18} />
                  Unlock Hint
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

function ChallengeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState([]);
  const [unlockingHint, setUnlockingHint] = useState(null);
  const [showSolvesModal, setShowSolvesModal] = useState(false);
  const [showHintConfirm, setShowHintConfirm] = useState(false);
  const [pendingHintUnlock, setPendingHintUnlock] = useState(null);
  const { user, isAuthenticated, updateUserData } = useContext(AuthContext);

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/challenges/${id}`);
        console.log('Initial challenge fetch:', {
          unlockedHints: res.data.unlockedHints,
          challengeTitle: res.data.data.title,
          files: res.data.data.files,
          hasFiles: res.data.data.files && res.data.data.files.length > 0
        });
        setChallenge(res.data.data);
        setUnlockedHints(res.data.unlockedHints || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching challenge:', err);
        setError('Challenge not found');
        setLoading(false);
      }
    };

    fetchChallenge();
  }, [id]);

  const openModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const submitFlag = async (flag) => {
    if (!challenge || !isAuthenticated) {
      throw new Error('Challenge not found or user not authenticated');
    }

    try {
      const res = await axios.post(
        `/api/challenges/${challenge._id}/submit`,
        { flag },
        { timeout: 10000 } // 10 second timeout
      );

      // Refetch challenge data to update solved status
      const challengeRes = await axios.get(`/api/challenges/${challenge._id}`);
      setChallenge(challengeRes.data.data);
      
      await updateUserData();
      return res.data;
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      }
      
      // Handle custom error object from axios interceptor (rate limit, etc.)
      if (err.message && typeof err.message === 'string' && err.type) {
        throw new Error(err.message);
      }
      
      // Handle backend error responses (both 'error' and 'message' fields)
      if (err.response?.data?.error) {
        throw new Error(err.response.data.error);
      }
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
      
      // Handle status code errors
      if (err.response?.status === 400) {
        throw new Error('Incorrect flag');
      }
      
      // Fallback error - extract message from error object if available
      throw new Error(err.message || 'Flag submission failed. Please try again.');
    }
  };

  const unlockHint = async (hintIndex) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const hint = challenge.hints[hintIndex];
    const userPoints = user.points || 0;
    
    // Extract team ID properly (handle both string and object cases)
    const teamId = user.team?._id || user.team;
    const hasTeam = !!teamId;

    // If user has a team, fetch the latest team points using the team ID
    let teamPoints = 0;
    if (hasTeam) {
      try {
        const teamRes = await axios.get(`/api/teams/${teamId}`);
        // Backend calculates: member points + team awards (includes hint deductions)
        teamPoints = teamRes.data.data.totalPoints || 0;
        console.log('[Unlock] Team total points (with awards):', teamPoints);
      } catch (err) {
        console.error('[Unlock] Error fetching team points:', err);
        // Fallback to user.team.points if fetch fails
        teamPoints = user.team?.points || 0;
      }
    }

    // Use team points if in a team, otherwise use individual points
    const availablePoints = hasTeam ? teamPoints : userPoints;
    const pointsType = hasTeam ? 'team' : 'individual';

    console.log('[Hint Unlock] Points check:', {
      hasTeam,
      teamPoints,
      userPoints,
      availablePoints,
      hintCost: hint.cost
    });

    // Check if enough points available
    if (availablePoints < hint.cost) {
      alert(`Insufficient points! You need ${hint.cost} points but have ${availablePoints} ${pointsType} points.`);
      return;
    }

    // Show custom confirmation modal with correct points
    setPendingHintUnlock({ 
      hint, 
      hintIndex, 
      teamPoints: availablePoints, // Pass the actual available points
      pointsType 
    });
    setShowHintConfirm(true);
  };

  const confirmHintUnlock = async () => {
    if (!pendingHintUnlock) return;

    const { hintIndex } = pendingHintUnlock;
    setShowHintConfirm(false);

    try {
      setUnlockingHint(hintIndex);
      
      // unlock: POST to /api/unlocks with target, type, challenge
      const res = await axios.post(
        `/api/unlocks`,
        { 
          target: hintIndex,
          type: 'hints',
          challenge: challenge._id
        },
        { timeout: 10000 }
      );

      console.log('[Unlock] Hint unlock response:', res.data);

      // Refetch challenge data to get updated hints with unlocked property
      const challengeRes = await axios.get(`/api/challenges/${challenge._id}`, {
        timeout: 10000
      });
      
      console.log('[Unlock] Challenge refetch response:', {
        hints: challengeRes.data.data.hints,
        unlockedHints: challengeRes.data.unlockedHints,
        fullResponse: challengeRes.data
      });
      
      setChallenge(challengeRes.data.data);
      setUnlockedHints(challengeRes.data.unlockedHints || []);
      
      console.log('[Unlock] State updated, new challenge:', challengeRes.data.data);

      // Update user data to reflect new points
      await updateUserData();

      alert('Hint unlocked successfully!');
    } catch (err) {
      console.error('[Unlock] Hint unlock error:', err);
      const errorMsg = err.response?.data?.errors?.target || 
                       err.response?.data?.errors?.score ||
                       err.response?.data?.message || 
                       'Failed to unlock hint';
      alert(errorMsg);
    } finally {
      setUnlockingHint(null);
      setPendingHintUnlock(null);
    }
  };

  const cancelHintUnlock = () => {
    setShowHintConfirm(false);
    setPendingHintUnlock(null);
  };

  if (loading) {
    return (
      <div className="htb-challenge-container">
        <div className="htb-challenge-grid-bg"></div>
        <div className="challenge-details-container">
          <Loading text="LOADING CHALLENGE..." />
        </div>
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="htb-challenge-container">
        <div className="htb-challenge-grid-bg"></div>
        <div className="challenge-details-container">
          <div className="error">{error || 'Challenge not found'}</div>
          <button onClick={() => navigate('/challenges')} className="back-button">
            ← Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  const isSolved = user?.solvedChallenges?.includes(challenge._id);

  return (
    <div className="htb-challenge-container">
      <div className="htb-challenge-grid-bg"></div>
      
      <motion.div 
        className="htb-challenge-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.button 
          onClick={() => navigate('/challenges')} 
          className="htb-back-btn"
        >
          <ChevronLeft size={20} />
          Back
        </motion.button>
        <h1 className="htb-challenge-title">
          {challenge.title}
        </h1>
      </motion.div>

      <div className="htb-challenge-main">
        <motion.div 
          className="htb-challenge-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="htb-challenge-meta">
            <motion.div 
              className="htb-meta-badge htb-points"
              whileHover={{ scale: 1.05 }}
            >
              <Award size={16} />
              <span>{challenge.points} pts</span>
            </motion.div>
            <motion.div 
              className="htb-meta-badge htb-category"
              whileHover={{ scale: 1.05 }}
            >
              <span>{challenge.category}</span>
            </motion.div>
            <motion.div
              className="htb-meta-badge htb-solves"
              onClick={() => setShowSolvesModal(true)}
              whileHover={{ scale: 1.05 }}
            >
              <Users size={16} />
              <span>{challenge.solvedBy?.length || 0} solves</span>
            </motion.div>
          </div>

          <motion.div 
            className="htb-section htb-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="htb-section-title">
              <span className="htb-title-line"></span>
              Description
            </h3>
            <div className="htb-description-content">
              <p>{challenge.description}</p>
            </div>
          </motion.div>

          {challenge.files && challenge.files.length > 0 && (
            <motion.div 
              className="htb-section htb-files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <h3 className="htb-section-title">
                <span className="htb-title-line"></span>
                Challenge Files
              </h3>
              <div className="htb-files-list">
                {challenge.files.map((file, index) => (
                  <div key={index} className="htb-file-item">
                    <div className="htb-file-info">
                      <span className="htb-file-name">{file.originalName}</span>
                      <span className="htb-file-size">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const encodedFilename = encodeURIComponent(file.filename);
                        window.open(
                          `/api/challenges/${challenge._id}/download/${encodedFilename}`,
                          '_blank'
                        );
                      }}
                      className="htb-download-btn"
                    >
                      <svg 
                        className="download-icon" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
                        />
                      </svg>
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {challenge.hints && challenge.hints.length > 0 && (
            <motion.div 
              className="htb-section htb-hints"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="htb-section-title">
                <span className="htb-title-line"></span>
                Hints
              </h3>
              <div className="htb-hints-list">
                {challenge.hints.map((hint, index) => {
                  // backend returns hints with 'unlocked' property
                  const isUnlocked = hint.unlocked === true;
                  const isFree = hint.cost === 0;
                  const showContent = isUnlocked || isFree;

                  return (
                    <motion.div 
                      key={hint.id || index} 
                      className={`htb-hint-card ${showContent ? 'unlocked' : 'locked'}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="htb-hint-icon">
                        {showContent ? <Unlock size={20} /> : <Lock size={20} />}
                      </div>
                      {showContent ? (
                        <p className="htb-hint-text">{hint.content}</p>
                      ) : (
                        <div className="htb-hint-locked">
                          <motion.button
                            className="htb-unlock-btn"
                            onClick={() => unlockHint(hint.id || index)}
                            disabled={!isAuthenticated || unlockingHint === (hint.id || index)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {unlockingHint === (hint.id || index) ? 'Unlocking...' : `Unlock for ${hint.cost} points`}
                          </motion.button>
                          {!isAuthenticated && (
                            <p className="htb-login-hint">Login to unlock this hint</p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div 
            className="htb-challenge-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <motion.button
              className={`htb-submit-btn ${isSolved ? 'solved' : ''} ${!isAuthenticated ? 'disabled' : ''}`}
              onClick={openModal}
              disabled={isSolved}
              whileHover={!isSolved ? { scale: 1.05, boxShadow: '0 0 30px var(--primary-glow)' } : {}}
              whileTap={!isSolved ? { scale: 0.95 } : {}}
            >
              {isSolved ? (
                <>
                  <CheckCircle2 size={20} />
                  Solved
                </>
              ) : isAuthenticated ? (
                <>
                  <Flag size={20} />
                  Submit Flag
                </>
              ) : (
                'Login to Solve'
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {showSolvesModal && challenge && (
        <SolvesModal
          challenge={challenge}
          onClose={() => setShowSolvesModal(false)}
        />
      )}

      {showModal && challenge && (
        <FlagSubmissionModal
          challenge={challenge}
          onClose={closeModal}
          onSubmit={submitFlag}
        />
      )}

      {showHintConfirm && pendingHintUnlock && (
        <HintUnlockModal
          hint={pendingHintUnlock.hint}
          hintIndex={pendingHintUnlock.hintIndex}
          teamPoints={pendingHintUnlock.teamPoints}
          pointsType={pendingHintUnlock.pointsType || 'team'}
          onClose={cancelHintUnlock}
          onConfirm={confirmHintUnlock}
        />
      )}
    </div>
  );
}

export default ChallengeDetails;