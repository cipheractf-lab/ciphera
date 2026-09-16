import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './AdminDashboard.css';

function PlatformReset() {
  const navigate = useNavigate();
  const [securityCode, setSecurityCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationType, setConfirmationType] = useState('');

  const handleCompetitionReset = () => {
    if (!securityCode) {
      setError('Please enter security code first');
      return;
    }
    setConfirmationType('competition');
    setShowConfirmModal(true);
    setError('');
  };

  const handleFullPlatformReset = () => {
    if (!securityCode) {
      setError('Please enter security code first');
      return;
    }
    setConfirmationType('full');
    setShowConfirmModal(true);
    setError('');
  };

  const confirmReset = async () => {
    setShowConfirmModal(false);
    setIsResetting(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = confirmationType === 'full' 
        ? '/api/admin/reset/full-platform'
        : '/api/admin/reset/competition-progress';

      const response = await axios.post(endpoint, { securityCode });
      
      setSuccess(response.data.message || 'Reset completed successfully!');
      setSecurityCode('');
      
      // Clear any cached data and reload the entire application
      if (typeof window !== 'undefined') {
        // Clear session storage to force data refresh
        sessionStorage.clear();
        
        // Reload after a brief delay to show success message
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Reset operation failed');
    } finally {
      setIsResetting(false);
    }
  };

  const cancelReset = () => {
    setShowConfirmModal(false);
    setConfirmationType('');
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Platform <span className="highlight">Reset</span></h1>
        <p>Enterprise-grade reset operations with transaction safety</p>
      </div>

      <div className="dashboard-section">
        <div className="reset-warning">
          <h2>⚠️ CRITICAL OPERATIONS</h2>
          <p>These actions permanently modify platform data. All operations use database transactions for data integrity.</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="form-group">
          <label htmlFor="securityCode">Security Code:</label>
          <input
            type="password"
            id="securityCode"
            value={securityCode}
            onChange={(e) => {
              setSecurityCode(e.target.value);
              setError('');
            }}
            autoComplete="off"
            placeholder="Enter security code"
            disabled={isResetting}
            style={{ marginBottom: '2rem' }}
          />
          <small style={{ color: '#888', display: 'block', marginTop: '0.5rem' }}>
            Contact system administrator for security code
          </small>
        </div>

        <div className="reset-options">
          <div className="reset-option-card">
            <h3>Reset Competition Progress</h3>
            <p className="card-description">
              Unified reset operation that clears all competition progress while preserving 
              the platform structure (users, teams, challenges).
            </p>
            <div className="reset-details">
              <h4>Will Reset:</h4>
              <ul>
                <li>All user points to 0</li>
                <li>All team points to 0</li>
                <li>All solved challenges status</li>
                <li>All submissions (deleted)</li>
                <li>All unlocked hints (re-locked)</li>
                <li>Competition timers</li>
                <li>Redis cache cleared</li>
              </ul>
              <h4>Will Preserve:</h4>
              <ul>
                <li>All user accounts</li>
                <li>All team accounts</li>
                <li>All challenges</li>
                <li>All notices and blogs</li>
                <li>Admin accounts and settings</li>
              </ul>
            </div>
            <button
              onClick={handleCompetitionReset}
              className="btn-warning"
              disabled={isResetting || !securityCode}
              style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            >
              {isResetting && confirmationType === 'competition' ? 'Resetting Competition...' : 'Reset Competition Progress'}
            </button>
          </div>

          <div className="reset-option-card" style={{ borderColor: '#dc3545' }}>
            <h3 style={{ color: '#dc3545' }}>Full Platform Reset</h3>
            <p className="card-description">
              Complete platform wipe returning to fresh install state. 
              <strong> Admin accounts are preserved.</strong>
            </p>
            <div className="reset-details">
              <h4>Will Delete:</h4>
              <ul>
                <li>All regular user accounts</li>
                <li>All team accounts</li>
                <li>All challenges</li>
                <li>All submissions</li>
                <li>All notices</li>
                <li>All blogs and tutorials</li>
                <li>All contacts and newsletter subscriptions</li>
                <li>All login logs</li>
                <li>All competitions and events</li>
                <li>All registration records</li>
                <li>Redis cache cleared</li>
              </ul>
              <h4>Will Preserve:</h4>
              <ul>
                <li>Admin accounts only</li>
                <li>Admin points reset to 0</li>
              </ul>
            </div>
            <button
              onClick={handleFullPlatformReset}
              className="btn-danger"
              disabled={isResetting || !securityCode}
              style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
            >
              {isResetting && confirmationType === 'full' ? 'Resetting Platform...' : 'Full Platform Reset'}
            </button>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="btn-secondary"
            disabled={isResetting}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={cancelReset}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm {confirmationType === 'full' ? 'Full Platform Reset' : 'Competition Progress Reset'}</h2>
            
            {confirmationType === 'full' ? (
              <div>
                <p style={{ color: '#dc3545', fontWeight: 'bold', marginBottom: '1rem' }}>
                  ⚠️ WARNING: This will DELETE ALL platform data except admin accounts!
                </p>
                <p>Are you absolutely sure you want to proceed?</p>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  This operation uses database transactions and cannot be undone.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ color: '#ffc107', fontWeight: 'bold', marginBottom: '1rem' }}>
                  ⚠️ WARNING: This will reset all competition progress!
                </p>
                <p>All scores, submissions, and solved status will be cleared.</p>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                  Users and challenges will be preserved. This operation uses database transactions.
                </p>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelReset}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className={confirmationType === 'full' ? 'btn-danger' : 'btn-warning'}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #1a1a2e;
          padding: 2rem;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          border: 1px solid #333;
        }

        .modal-content h2 {
          margin-bottom: 1rem;
          color: #00d9ff;
        }

        .reset-option-card {
          background: #16213e;
          border: 2px solid #0f3460;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .reset-option-card h3 {
          margin-bottom: 1rem;
          color: #00d9ff;
        }

        .card-description {
          margin-bottom: 1.5rem;
          color: #ccc;
          line-height: 1.6;
        }

        .reset-details {
          margin: 1rem 0;
        }

        .reset-details h4 {
          color: #00d9ff;
          font-size: 0.9rem;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .reset-details ul {
          list-style: disc;
          padding-left: 1.5rem;
          color: #aaa;
        }

        .reset-details li {
          margin: 0.3rem 0;
          font-size: 0.9rem;
        }

        .btn-warning {
          background: #ffc107;
          color: #000;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-warning:hover:not(:disabled) {
          background: #ffca28;
        }

        .btn-warning:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
          border: none;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .btn-danger:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default PlatformReset;