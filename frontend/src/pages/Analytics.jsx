import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './Analytics.css';

function Analytics() {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  const [overview, setOverview] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [challengeStats, setChallengeStats] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const [progression, setProgression] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [challengeSearch, setChallengeSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdminUser = user && user.role === 'admin';

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (user && !isAdminUser) {
      return;
    }
  }, [isAuthenticated, user, isAdminUser]);

  useEffect(() => {
    if (!isAuthenticated || !isAdminUser) {
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setDataLoading(true);

        const [
          overviewRes,
          engagementRes,
          challengeRes,
          trafficRes,
          scoreboardRes,
          progressionRes
        ] = await Promise.all([
          axios.get('/api/analytics/overview'),
          axios.get('/api/analytics/user-engagement'),
          axios.get('/api/analytics/challenge-stats'),
          axios.get('/api/analytics/traffic'),
          axios.get('/api/analytics/scoreboard-stats'),
          axios.get('/api/analytics/progression/matrix')
        ]);

        setOverview(overviewRes.data.data);
        setEngagement(engagementRes.data.data);
        setChallengeStats(challengeRes.data.data);
        setTraffic(trafficRes.data.data);
        setScoreboard(scoreboardRes.data.data);
        setProgression(progressionRes.data.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchAnalytics();
  }, [isAuthenticated, isAdminUser]);

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!loading && user && !isAdminUser) {
    return <Navigate to="/" />;
  }

  if (loading || dataLoading) {
    return (
      <div className="analytics-container">
        <div className="loading">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h1>Analytics <span className="highlight">Dashboard</span></h1>
        <p>Monitor platform metrics and user engagement</p>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="analytics-section">
          <h2>Platform Overview</h2>
          <div className="cards-grid">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{overview.users.total}</div>
              <div className="stat-sublabel">Active: {overview.users.active}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Admin Users</div>
              <div className="stat-value">{overview.users.admins}</div>
              <div className="stat-sublabel">Blocked: {overview.users.blocked}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Challenges</div>
              <div className="stat-value">{overview.challenges.total}</div>
              <div className="stat-sublabel">Visible: {overview.challenges.visible}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Submissions</div>
              <div className="stat-value">{overview.submissions.total}</div>
              <div className="stat-sublabel">Total Points: {overview.submissions.totalPoints}</div>
            </div>
          </div>
        </div>
      )}

      {/* Player Progression */}
      {progression && (
        <div className="analytics-section">
          <h2>Player Progression <span className="subtle">(Top 100)</span></h2>

          <div className="progression-controls">
            <input
              type="text"
              placeholder="Filter players..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="progression-search"
            />
            <input
              type="text"
              placeholder="Filter challenges..."
              value={challengeSearch}
              onChange={(e) => setChallengeSearch(e.target.value)}
              className="progression-search"
            />
          </div>

          <div className="progression-legend">
            <span className="legend-item"><span className="legend-box solved" />Solved</span>
            <span className="legend-item"><span className="legend-box attempted" />Attempted</span>
            <span className="legend-item"><span className="legend-box unopened" />Unopened</span>
          </div>

          <div className="progression-meta">
            Showing {progression.scoreboard.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase())).length} players and {progression.challenges.filter((c) => c.name.toLowerCase().includes(challengeSearch.toLowerCase())).length} challenges
          </div>

          <div className="progression-table-wrap">
            <table className="progression-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-place">Place</th>
                  <th className="sticky-col sticky-name">User</th>
                  <th className="sticky-col sticky-score">Score</th>
                  {progression.challenges
                    .filter((challenge) => challenge.name.toLowerCase().includes(challengeSearch.toLowerCase()))
                    .map((challenge) => (
                      <th key={challenge.id} className="challenge-header" title={`${challenge.name} (${challenge.category}) - ${challenge.value} pts`}>
                        <div>{challenge.name}</div>
                        <small>{challenge.category} • {challenge.value}</small>
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {progression.scoreboard
                  .filter((entry) => entry.name.toLowerCase().includes(userSearch.toLowerCase()))
                  .map((entry) => {
                    const solvedSet = new Set(entry.solves || []);
                    const attemptSet = new Set(entry.attempts || []);

                    return (
                      <tr key={entry.id}>
                        <td className="sticky-col sticky-place">{entry.place}</td>
                        <td className="sticky-col sticky-name">{entry.name}</td>
                        <td className="sticky-col sticky-score">{entry.score}</td>
                        {progression.challenges
                          .filter((challenge) => challenge.name.toLowerCase().includes(challengeSearch.toLowerCase()))
                          .map((challenge) => {
                            const isSolved = solvedSet.has(challenge.id);
                            const isAttempted = attemptSet.has(challenge.id);

                            return (
                              <td
                                key={`${entry.id}-${challenge.id}`}
                                className={`progression-cell ${isSolved ? 'cell-solved' : isAttempted ? 'cell-attempted' : 'cell-unopened'}`}
                              >
                                {isSolved ? '✓' : '•'}
                              </td>
                            );
                          })}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Engagement */}
      {engagement && (
        <div className="analytics-section">
          <h2>User Engagement</h2>
          <div className="engagement-grid">
            <div className="engagement-card">
              <div className="engagement-label">High Engagement</div>
              <div className="engagement-value" style={{ color: '#00ff00' }}>
                {engagement.summary.highEngagement}
              </div>
              <div className="engagement-desc">5+ challenges solved</div>
            </div>
            <div className="engagement-card">
              <div className="engagement-label">Medium Engagement</div>
              <div className="engagement-value" style={{ color: '#ffaa00' }}>
                {engagement.summary.mediumEngagement}
              </div>
              <div className="engagement-desc">2-4 challenges solved</div>
            </div>
            <div className="engagement-card">
              <div className="engagement-label">Low Engagement</div>
              <div className="engagement-value" style={{ color: '#ff6b6b' }}>
                {engagement.summary.lowEngagement}
              </div>
              <div className="engagement-desc">0-1 challenges solved</div>
            </div>
            <div className="engagement-card">
              <div className="engagement-label">Inactive Users</div>
              <div className="engagement-value" style={{ color: '#888' }}>
                {engagement.summary.inactive}
              </div>
              <div className="engagement-desc">Blocked accounts</div>
            </div>
          </div>
        </div>
      )}

      {/* Challenge Statistics */}
      {challengeStats && (
        <div className="analytics-section">
          <h2>Challenge Statistics</h2>
          <div className="challenge-stats">
            <div className="stats-subsection">
              <h3>By Category</h3>
              <div className="category-stats">
                {Object.entries(challengeStats.byCategory).map(([category, data]) => (
                  <div key={category} className="category-item">
                    <span className="category-name">{category}</span>
                    <span className="category-count">{data.count} challenges</span>
                    <span className="category-solved">{data.solved} solves</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="stats-subsection">
              <h3>Top Challenges</h3>
              <div className="challenge-list">
                {challengeStats.topChallenges.map((challenge, index) => (
                  <div key={index} className="challenge-item">
                    <span className="challenge-rank">#{index + 1}</span>
                    <span className="challenge-name">{challenge.title}</span>
                    <span className="challenge-solves">{challenge.solves} solves</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="stats-subsection">
              <h3>Least Solved</h3>
              <div className="challenge-list">
                {challengeStats.leastSolved.map((challenge, index) => (
                  <div key={index} className="challenge-item">
                    <span className="challenge-rank">#{index + 1}</span>
                    <span className="challenge-name">{challenge.title}</span>
                    <span className="challenge-solves">{challenge.solves} solves</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Traffic */}
      {traffic && (
        <div className="analytics-section">
          <h2>Traffic & Growth</h2>
          <div className="traffic-grid">
            <div className="traffic-card">
              <div className="traffic-label">Last 30 Days</div>
              <div className="traffic-value">{traffic.last30Days}</div>
              <div className="traffic-desc">new registrations</div>
            </div>
            <div className="traffic-card">
              <div className="traffic-label">Last 7 Days</div>
              <div className="traffic-value">{traffic.last7Days}</div>
              <div className="traffic-desc">new registrations</div>
            </div>
            <div className="traffic-card">
              <div className="traffic-label">Today</div>
              <div className="traffic-value">{traffic.today}</div>
              <div className="traffic-desc">new registrations</div>
            </div>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      {scoreboard && (
        <div className="analytics-section">
          <h2>Top Users</h2>
          <div className="scoreboard-table">
            <div className="table-header">
              <div className="col-rank">Rank</div>
              <div className="col-username">Username</div>
              <div className="col-points">Points</div>
              <div className="col-challenges">Challenges</div>
            </div>
            {scoreboard.map(user => (
              <div key={user.rank} className="table-row">
                <div className="col-rank">#{user.rank}</div>
                <div className="col-username">{user.username}</div>
                <div className="col-points">{user.points}</div>
                <div className="col-challenges">{user.challengesSolved}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
