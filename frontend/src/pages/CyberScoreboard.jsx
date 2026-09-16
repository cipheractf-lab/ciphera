import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Users, User as UserIcon, RefreshCw } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import ScoreGraph from '../components/ScoreGraph';
import { Card, CardHeader, CardBody, Badge, Loading, Button } from '../components/ui';
import CustomMessageDisplay from '../components/CustomMessageDisplay';
import { useEventState } from '../hooks/useEventState';
import './CyberScoreboard.css';

function Scoreboard() {
  const { eventState: ctfEventState, customMessage } = useEventState();
  const { isAuthenticated, user } = useContext(AuthContext);
  const [viewType, setViewType] = useState('teams');
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [graphKey, setGraphKey] = useState(0);

  if (customMessage) {
    return <CustomMessageDisplay message={customMessage} />;
  }

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 30000);
    return () => clearInterval(interval);
  }, [viewType, isAuthenticated]);

  const fetchScoreboard = async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const res = await axios.get(`/api/v1/scoreboard?type=${viewType}`);
      if (res.data.success) {
        setStandings(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Scoreboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (manual) {
        // Force graph refresh by changing key
        setGraphKey(prev => prev + 1);
      }
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={24} className="rank-icon rank-icon--gold" />;
    if (rank === 2) return <Medal size={24} className="rank-icon rank-icon--silver" />;
    if (rank === 3) return <Award size={24} className="rank-icon rank-icon--bronze" />;
    return <span className="rank-number">{rank}</span>;
  };

  const isCurrentUser = (entry) => {
    if (viewType === 'users') {
      return user?.id === entry.account_id || user?._id === entry.account_id;
    }
    return user?.team?._id === entry.account_id || user?.team?.id === entry.account_id;
  };

  return (
    <div className="scoreboard-page-shell">
      <div className="scoreboard-page-bg" aria-hidden="true" />
      <div className="scoreboard-orb scoreboard-orb--primary" aria-hidden="true" />
      <div className="scoreboard-orb scoreboard-orb--secondary" aria-hidden="true" />
      <div className="scoreboard-orb scoreboard-orb--tertiary" aria-hidden="true" />

      <div className="scoreboard-page">
        <div className="cyber-scoreboard-container">
          <div className="cyber-scoreboard-header">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="cyber-scoreboard-title-section"
            >
              <div className="cyber-scoreboard-icon">
                <Trophy size={48} />
              </div>
              <div>
                <h1 className="cyber-scoreboard-title">
                  <span className="text-gradient">LEADERBOARD</span>
                </h1>
                <p className="cyber-scoreboard-subtitle">Real-time competition standings</p>
              </div>
            </motion.div>

            <div className="cyber-scoreboard-actions">
              <Button
                variant="outline"
                className="cyber-scoreboard-refresh-btn"
                icon={<RefreshCw size={18} />}
                onClick={() => fetchScoreboard(true)}
                loading={refreshing}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="cyber-scoreboard-tabs">
            <button
              className={`cyber-scoreboard-tab ${viewType === 'teams' ? 'cyber-scoreboard-tab--active' : ''}`}
              onClick={() => setViewType('teams')}
            >
              <Users size={20} />
              <span>Teams</span>
            </button>
            <button
              className={`cyber-scoreboard-tab ${viewType === 'users' ? 'cyber-scoreboard-tab--active' : ''}`}
              onClick={() => setViewType('users')}
            >
              <UserIcon size={20} />
              <span>Individual</span>
            </button>
          </div>

          <Card className="cyber-scoreboard-graph-card">
            <CardHeader>
              <div className="cyber-scoreboard-graph-header">
                <TrendingUp size={20} />
                <span>Top 10 Score Progression</span>
              </div>
            </CardHeader>
            <CardBody>
              <ScoreGraph key={`${viewType}-${graphKey}`} type={viewType} limit={10} />
            </CardBody>
          </Card>

          <Card className="cyber-scoreboard-table-card">
            {loading ? (
              <div className="cyber-scoreboard-loading">
                <Loading text="LOADING STANDINGS..." />
              </div>
            ) : standings.length === 0 ? (
              <div className="cyber-scoreboard-empty">
                <Trophy size={64} className="cyber-scoreboard-empty-icon" />
                <h3>No Standings Yet</h3>
                <p>Be the first to solve a challenge!</p>
              </div>
            ) : (
              <div className="cyber-scoreboard-table">
                <div className="cyber-scoreboard-table-header">
                  <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--rank">Rank</div>
                  <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--name">
                    {viewType === 'teams' ? 'Team' : 'Player'}
                  </div>
                  <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--score">Score</div>
                </div>
                <div className="cyber-scoreboard-table-body">
                  {standings.map((entry, idx) => (
                    <motion.div
                      key={entry.account_id}
                      className={`cyber-scoreboard-table-row ${
                        isCurrentUser(entry) ? 'cyber-scoreboard-table-row--current' : ''
                      } ${entry.pos <= 3 ? `cyber-scoreboard-table-row--top${entry.pos}` : ''}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--rank">
                        {getRankIcon(entry.pos)}
                      </div>
                      <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--name">
                        <a href={entry.account_url} className="cyber-scoreboard-name-link">
                          {entry.name}
                          {isCurrentUser(entry) && (
                            <Badge variant="primary" size="sm" className="cyber-scoreboard-you-badge">
                              YOU
                            </Badge>
                          )}
                        </a>
                      </div>
                      <div className="cyber-scoreboard-table-cell cyber-scoreboard-table-cell--score">
                        <span className="cyber-scoreboard-score">{entry.score}</span>
                        <span className="cyber-scoreboard-points-label">PTS</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Scoreboard;
