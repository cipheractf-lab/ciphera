import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminStatistics.css';

function AdminStatistics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [userMatrix, setUserMatrix] = useState({ scoreboard: [], challenges: [] });
  const [teamMatrix, setTeamMatrix] = useState({ scoreboard: [], challenges: [] });
  const [solveCounts, setSolveCounts] = useState([]);
  const [solvePercentages, setSolvePercentages] = useState([]);
  const [submissionTypes, setSubmissionTypes] = useState({ correct: 0, incorrect: 0 });
  const [categoryCount, setCategoryCount] = useState({});
  const [categoryPoints, setCategoryPoints] = useState({});
  const [scoreDistribution, setScoreDistribution] = useState({ brackets: {} });

  const [userSearch, setUserSearch] = useState('');
  const [userChallengeSearch, setUserChallengeSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [teamChallengeSearch, setTeamChallengeSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const [
          userMatrixRes,
          teamMatrixRes,
          solvesRes,
          percentagesRes,
          submissionTypeRes,
          categoryCountRes,
          categoryPointsRes,
          scoreDistributionRes
        ] = await Promise.all([
          axios.get('/api/analytics/progression/matrix?mode=users'),
          axios.get('/api/analytics/progression/matrix?mode=teams'),
          axios.get('/api/analytics/statistics/challenges/solves'),
          axios.get('/api/analytics/statistics/challenges/solves/percentages'),
          axios.get('/api/analytics/statistics/submissions/type'),
          axios.get('/api/analytics/statistics/challenges/category?function=count&target=id'),
          axios.get('/api/analytics/statistics/challenges/category?function=sum&target=points'),
          axios.get('/api/analytics/statistics/scores/distribution')
        ]);

        setUserMatrix(userMatrixRes.data?.data || { scoreboard: [], challenges: [] });
        setTeamMatrix(teamMatrixRes.data?.data || { scoreboard: [], challenges: [] });
        setSolveCounts(solvesRes.data?.data || []);
        setSolvePercentages(percentagesRes.data?.data || []);
        setSubmissionTypes(submissionTypeRes.data?.data || { correct: 0, incorrect: 0 });
        setCategoryCount(categoryCountRes.data?.data || {});
        setCategoryPoints(categoryPointsRes.data?.data || {});
        setScoreDistribution(scoreDistributionRes.data?.data || { brackets: {} });
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredUsers = useMemo(() => {
    return (userMatrix.scoreboard || []).filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()));
  }, [userMatrix.scoreboard, userSearch]);

  const filteredUserChallenges = useMemo(() => {
    return (userMatrix.challenges || []).filter((c) => c.name.toLowerCase().includes(userChallengeSearch.toLowerCase()));
  }, [userMatrix.challenges, userChallengeSearch]);

  const filteredTeams = useMemo(() => {
    return (teamMatrix.scoreboard || []).filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()));
  }, [teamMatrix.scoreboard, teamSearch]);

  const filteredTeamChallenges = useMemo(() => {
    return (teamMatrix.challenges || []).filter((c) => c.name.toLowerCase().includes(teamChallengeSearch.toLowerCase()));
  }, [teamMatrix.challenges, teamChallengeSearch]);

  const totalSubmissions = (submissionTypes.correct || 0) + (submissionTypes.incorrect || 0);
  const solveRate = totalSubmissions > 0 ? ((submissionTypes.correct / totalSubmissions) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="stats-page-shell">
        <div className="stats-page-bg" aria-hidden="true" />
        <div className="stats-orb stats-orb--primary" aria-hidden="true" />
        <div className="stats-orb stats-orb--secondary" aria-hidden="true" />
        <div className="stats-orb stats-orb--tertiary" aria-hidden="true" />
        <div className="stats-page"><div className="stats-loading">Loading statistics...</div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="stats-page-shell">
        <div className="stats-page-bg" aria-hidden="true" />
        <div className="stats-orb stats-orb--primary" aria-hidden="true" />
        <div className="stats-orb stats-orb--secondary" aria-hidden="true" />
        <div className="stats-orb stats-orb--tertiary" aria-hidden="true" />
        <div className="stats-page"><div className="stats-error">{error}</div></div>
      </div>
    );
  }

  return (
    <div className="stats-page-shell">
      <div className="stats-page-bg" aria-hidden="true" />
      <div className="stats-orb stats-orb--primary" aria-hidden="true" />
      <div className="stats-orb stats-orb--secondary" aria-hidden="true" />
      <div className="stats-orb stats-orb--tertiary" aria-hidden="true" />

      <div className="stats-page">
      <h1>Statistics</h1>

      <section className="stats-card">
        <h2>Player Progression (Top 100)</h2>

        <div className="stats-filters">
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Filter players" />
          <input value={userChallengeSearch} onChange={(e) => setUserChallengeSearch(e.target.value)} placeholder="Filter challenges" />
        </div>

        <div className="legend-row">
          <span><i className="box solved" /> Solved</span>
          <span><i className="box attempted" /> Attempted</span>
          <span><i className="box unopened" /> Unopened</span>
        </div>

        <div className="matrix-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky c1">Place</th>
                <th className="sticky c2">User</th>
                <th className="sticky c3">Score</th>
                {filteredUserChallenges.map((c) => (
                  <th key={c.id} title={`${c.name} (${c.category}) - ${c.value}pt`}>
                    <div>{c.name}</div>
                    <small>{c.category} • {c.value}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const solved = new Set(u.solves || []);
                const attempts = new Set(u.attempts || []);
                return (
                  <tr key={u.id}>
                    <td className="sticky c1">{u.place}</td>
                    <td className="sticky c2">{u.name}</td>
                    <td className="sticky c3">{u.score}</td>
                    {filteredUserChallenges.map((c) => {
                      const isSolved = solved.has(c.id);
                      const isAttempted = attempts.has(c.id);
                      return (
                        <td key={`${u.id}-${c.id}`} className={isSolved ? 'cell solved' : isAttempted ? 'cell attempted' : 'cell unopened'}>
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
      </section>

      <section className="stats-card">
        <h2>Team Progression (Top 100)</h2>

        <div className="stats-filters">
          <input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="Filter teams" />
          <input value={teamChallengeSearch} onChange={(e) => setTeamChallengeSearch(e.target.value)} placeholder="Filter challenges" />
        </div>

        <div className="legend-row">
          <span><i className="box solved" /> Solved</span>
          <span><i className="box attempted" /> Attempted</span>
          <span><i className="box unopened" /> Unopened</span>
        </div>

        <div className="matrix-wrap">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky c1">Place</th>
                <th className="sticky c2">Team</th>
                <th className="sticky c3">Score</th>
                {filteredTeamChallenges.map((c) => (
                  <th key={c.id} title={`${c.name} (${c.category}) - ${c.value}pt`}>
                    <div>{c.name}</div>
                    <small>{c.category} • {c.value}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map((t) => {
                const solved = new Set(t.solves || []);
                const attempts = new Set(t.attempts || []);
                return (
                  <tr key={t.id}>
                    <td className="sticky c1">{t.place}</td>
                    <td className="sticky c2">{t.name}</td>
                    <td className="sticky c3">{t.score}</td>
                    {filteredTeamChallenges.map((c) => {
                      const isSolved = solved.has(c.id);
                      const isAttempted = attempts.has(c.id);
                      return (
                        <td key={`${t.id}-${c.id}`} className={isSolved ? 'cell solved' : isAttempted ? 'cell attempted' : 'cell unopened'}>
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
      </section>

      <div className="stats-grid">
        <section className="stats-card">
          <h3>Submission Percentages</h3>
          <p>Solves: {submissionTypes.correct}</p>
          <p>Fails: {submissionTypes.incorrect}</p>
          <p>Solve Rate: {solveRate}%</p>
        </section>

        <section className="stats-card">
          <h3>Category Breakdown</h3>
          {Object.entries(categoryCount).map(([k, v]) => (
            <div key={k} className="row"><span>{k}</span><b>{v}</b></div>
          ))}
        </section>

        <section className="stats-card">
          <h3>Point Breakdown</h3>
          {Object.entries(categoryPoints).map(([k, v]) => (
            <div key={k} className="row"><span>{k}</span><b>{v}</b></div>
          ))}
        </section>

        <section className="stats-card">
          <h3>Score Distribution</h3>
          {Object.entries(scoreDistribution.brackets || {}).sort((a, b) => Number(a[0]) - Number(b[0])).map(([b, count]) => (
            <div key={b} className="row"><span>&lt; {b}</span><b>{count}</b></div>
          ))}
        </section>
      </div>

      <section className="stats-card">
        <h3>Solve Counts</h3>
        <div className="list-grid">
          {solveCounts
            .sort((a, b) => b.solves - a.solves)
            .map((s) => (
              <div key={s.id} className="row"><span>{s.name}</span><b>{s.solves}</b></div>
            ))}
        </div>
      </section>

      <section className="stats-card">
        <h3>Solve Percentages per Challenge</h3>
        <div className="list-grid">
          {solvePercentages
            .sort((a, b) => b.percentage - a.percentage)
            .map((s) => (
              <div key={s.id} className="row"><span>{s.name}</span><b>{s.percentage}%</b></div>
            ))}
        </div>
      </section>
      </div>
    </div>
  );
}

export default AdminStatistics;
