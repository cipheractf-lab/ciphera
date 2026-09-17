import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, X, Upload, User } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading, Button, Input } from '../components/ui';
import MarkdownEditor from '../components/MarkdownEditor';
import './MyTeam.css';

const TEAM_MIN_SIZE = 1;
const TEAM_MAX_SIZE = 4;

function CreateTeamModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post('/api/teams/self', {
        name: name.trim(),
        description: description.trim()
      });

      const team = res.data.data;

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        try {
          await axios.post(`/api/teams/${team._id}/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (avatarErr) {
          // Team was created successfully; avatar failed. Don't block on it.
          console.error('Avatar upload failed:', avatarErr);
        }
      }

      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <motion.div
        className="team-modal"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal-header">
          <h2><Plus size={20} /> Create Team</h2>
          <button className="team-modal-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="team-modal-body">
          <div className="team-avatar-picker">
            <label htmlFor="team-avatar-input" className="team-avatar-picker-preview">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Team avatar preview" />
              ) : (
                <Upload size={22} />
              )}
            </label>
            <input
              id="team-avatar-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarPick}
              hidden
            />
            <span className="team-avatar-picker-hint">Optional -- PNG/JPG/WEBP/GIF, max 2MB</span>
          </div>

          <Input
            label="Team Name"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Night Owls"
            maxLength={100}
          />

          <MarkdownEditor
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Tell people what your team is about (markdown supported)"
            maxLength={2000}
          />

          <p className="team-modal-note">
            Teams can have {TEAM_MIN_SIZE}-{TEAM_MAX_SIZE} members. You'll be the team leader --
            invite others once the team is created.
          </p>

          {error && <p className="team-modal-error">{error}</p>}

          <div className="team-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Create Team
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function MyTeam() {
  const { isAuthenticated, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchMyTeams = async () => {
    try {
      const res = await axios.get('/api/teams/mine');
      setTeams(res.data.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchMyTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="my-team-container">
        <Loading text="LOADING TEAMS..." />
      </div>
    );
  }

  return (
    <div className="my-teams-page">
      <div className="my-teams-header">
        <div className="my-teams-header-title">
          <span className="my-teams-icon"><Users size={24} /></span>
          <div>
            <h1>My Teams</h1>
            <p>Teams you lead or are a member of.</p>
          </div>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
          Create Team
        </Button>
      </div>

      {error && <p className="my-teams-error">{error}</p>}

      {teams.length === 0 ? (
        <div className="my-teams-empty">
          <Users size={40} />
          <p>You're not part of any team yet.</p>
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
            Create your first team
          </Button>
        </div>
      ) : (
        <div className="my-teams-table-wrap">
          <table className="my-teams-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Members</th>
                <th>Created On</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team._id}>
                  <td>
                    <div className="my-teams-team-cell">
                      <span className="my-teams-avatar">
                        {team.avatarUrl ? (
                          <img src={team.avatarUrl} alt={team.name} />
                        ) : (
                          <User size={18} />
                        )}
                      </span>
                      <span className="my-teams-team-name">
                        {team.name}
                        {team.isCaptain && <span className="my-teams-leader-tag">Leader</span>}
                      </span>
                    </div>
                  </td>
                  <td>{team.memberCount}</td>
                  <td>{new Date(team.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className="my-teams-actions-cell">
                    <Button variant="primary" size="sm" onClick={() => navigate(`/my-team/${team._id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateTeamModal
            onClose={() => setShowCreateModal(false)}
            onCreated={() => {
              setShowCreateModal(false);
              fetchMyTeams();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default MyTeam;
