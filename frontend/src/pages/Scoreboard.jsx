import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import ScoreGraph from '../components/ScoreGraph';
import { Loading } from '../components/ui';
// No CSS file needed if we use inline or global styles for simplicity/consistency,
// but for cleaner code we use standard layout classes which might exist or inline minimal styles.
// Simple Bootstrap-style tables.

function Scoreboard() {
  const { isAuthenticated } = useContext(AuthContext);
  const [viewType, setViewType] = useState('teams'); // 'teams' or 'users'
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScoreboard();
    const interval = setInterval(fetchScoreboard, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [viewType, isAuthenticated]);

  const fetchScoreboard = async () => {
    try {
      const res = await axios.get(`/api/v1/scoreboard?type=${viewType}`);
      if (res.data.success) {
        setStandings(res.data.data);
      }
      setLoading(false);
    } catch (err) {
      console.error('Scoreboard load error:', err);
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#e0e6ed' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#ffffff', fontWeight: '700' }}>Scoreboard</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <button
          onClick={() => setViewType('teams')}
          style={{
            padding: '10px 20px',
            background: viewType === 'teams' ? '#A855F7' : 'transparent',
            color: viewType === 'teams' ? '#000' : '#A855F7',
            border: '2px solid #A855F7',
            borderRadius: '5px 0 0 5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          Teams
        </button>
        <button
          onClick={() => setViewType('users')}
          style={{
            padding: '10px 20px',
            background: viewType === 'users' ? '#A855F7' : 'transparent',
            color: viewType === 'users' ? '#000' : '#A855F7',
            border: '2px solid #A855F7',
            borderLeft: 'none',
            borderRadius: '0 5px 5px 0',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          Users
        </button>
      </div>

      {/* Graph */}
      <div style={{ marginBottom: '40px', background: '#1a2634', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>Top 10 Trend</h3>
        <ScoreGraph key={viewType} type={viewType} limit={10} />
      </div>

      {/* Table */}
      <div style={{ background: '#1a2634', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#243447', color: '#b0c4de' }}>
              <th style={{ padding: '15px', width: '80px', textAlign: 'center' }}>Place</th>
              <th style={{ padding: '15px' }}>{viewType === 'teams' ? 'Team' : 'User'}</th>
              <th style={{ padding: '15px', width: '120px', textAlign: 'center' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center' }}><Loading text="LOADING..." /></td></tr>
            ) : standings.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: '30px', textAlign: 'center' }}>No visible solves yet</td></tr>
            ) : (
              standings.map((entry, idx) => (
                <tr
                  key={entry.account_id}
                  style={{
                    borderBottom: '1px solid #2b3e50',
                    background: idx < 3 ? 'rgba(168, 85, 247, 0.05)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em', color: idx < 3 ? '#ffeb3b' : 'inherit' }}>
                    {entry.pos}
                  </td>
                  <td style={{ padding: '15px' }}>
                    <a href={entry.account_url} style={{ color: '#A855F7', textDecoration: 'none', fontWeight: '500' }}>
                      {entry.name}
                    </a>
                  </td>
                  <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2em' }}>
                    {entry.score}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Scoreboard;
