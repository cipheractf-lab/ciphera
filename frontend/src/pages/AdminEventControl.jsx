import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './AdminEventControl.css';

function AdminEventControl() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [eventState, setEventState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [times, setTimes] = useState({
    startTime: '',
    endTime: '',
    freezeTime: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const formatForInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const fetchStatus = async () => {
    try {
      setError('');
      const res = await axios.get('/api/event-control/status');
      const data = res.data.data;
      setEventState(data);
      setTimes({
        startTime: formatForInput(data.startedAt),
        endTime: formatForInput(data.endedAt),
        freezeTime: formatForInput(data.freezeAt)
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch event status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const runAction = async (action, endpoint) => {
    try {
      setWorking(action);
      setError('');
      setSuccess('');
      const res = await axios.post(endpoint);
      setSuccess(res.data?.message || `${action} completed`);
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action.toLowerCase()}`);
    } finally {
      setWorking('');
    }
  };

  const saveTimes = async (e) => {
    e.preventDefault();
    try {
      setWorking('set-times');
      setError('');
      setSuccess('');

      const payload = {
        startTime: times.startTime ? new Date(times.startTime).toISOString() : null,
        endTime: times.endTime ? new Date(times.endTime).toISOString() : null,
        freezeTime: times.freezeTime ? new Date(times.freezeTime).toISOString() : null
      };

      const res = await axios.post('/api/event-control/set-times', payload);
      setSuccess(res.data?.message || 'Competition times updated');
      await fetchStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save competition times');
    } finally {
      setWorking('');
    }
  };

  if (loading) {
    return <Loading text="LOADING EVENT CONTROL..." />;
  }

  return (
    <div className="admin-event-control-page">
      <h1>Event Control</h1>
      <p className="subtitle">
        Configure start, end, freeze, and pause behavior.
      </p>

      {success && <div className="alert success">{success}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="status-card">
        <h2>Current State</h2>
        <ul>
          <li><strong>Status:</strong> {eventState?.status || 'unknown'}</li>
          <li><strong>Submissions Allowed:</strong> {eventState?.isSubmissionAllowed ? 'Yes' : 'No'}</li>
          <li><strong>Paused:</strong> {eventState?.isPaused ? 'Yes' : 'No'}</li>
          <li><strong>Frozen:</strong> {eventState?.isFrozen ? 'Yes' : 'No'}</li>
          <li><strong>Start Time:</strong> {eventState?.startedAt ? new Date(eventState.startedAt).toLocaleString() : 'Not set'}</li>
          <li><strong>End Time:</strong> {eventState?.endedAt ? new Date(eventState.endedAt).toLocaleString() : 'Not set'}</li>
          <li><strong>Freeze Time:</strong> {eventState?.freezeAt ? new Date(eventState.freezeAt).toLocaleString() : 'Not set'}</li>
        </ul>
      </div>

      <form className="times-form" onSubmit={saveTimes}>
        <h2>Competition Times</h2>
        <p className="hint">Set planned times for start, end, and freeze.</p>

        <label>
          Start Time
          <input
            type="datetime-local"
            value={times.startTime}
            onChange={(e) => setTimes(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </label>

        <label>
          End Time
          <input
            type="datetime-local"
            value={times.endTime}
            onChange={(e) => setTimes(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </label>

        <label>
          Freeze Time
          <input
            type="datetime-local"
            value={times.freezeTime}
            onChange={(e) => setTimes(prev => ({ ...prev, freezeTime: e.target.value }))}
          />
        </label>

        <button type="submit" disabled={working === 'set-times'}>
          {working === 'set-times' ? 'Saving...' : 'Save Times'}
        </button>
      </form>

      <div className="actions-grid">
        <div className="action-card">
          <h3>Start CTF</h3>
          <button onClick={() => runAction('Start CTF', '/api/event-control/start')} disabled={!!working}>
            {working === 'Start CTF' ? 'Working...' : 'Start Now'}
          </button>
        </div>

        <div className="action-card">
          <h3>End CTF</h3>
          <button className="danger" onClick={() => runAction('End CTF', '/api/event-control/end')} disabled={!!working}>
            {working === 'End CTF' ? 'Working...' : 'End Now'}
          </button>
        </div>

        <div className="action-card">
          <h3>Freeze Scoreboard</h3>
          <button onClick={() => runAction('Freeze Scoreboard', '/api/event-control/freeze')} disabled={!!working}>
            {working === 'Freeze Scoreboard' ? 'Working...' : 'Freeze Now'}
          </button>
        </div>

        <div className="action-card">
          <h3>Pause CTF</h3>
          <button onClick={() => runAction('Pause CTF', '/api/event-control/pause')} disabled={!!working}>
            {working === 'Pause CTF' ? 'Working...' : 'Pause'}
          </button>
        </div>

        <div className="action-card">
          <h3>Resume CTF</h3>
          <button onClick={() => runAction('Resume CTF', '/api/event-control/resume')} disabled={!!working}>
            {working === 'Resume CTF' ? 'Working...' : 'Resume'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminEventControl;
