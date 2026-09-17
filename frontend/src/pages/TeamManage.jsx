import { useEffect, useState, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Pencil, UserPlus, X, Crown, Trash2, Upload, User, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading, Button, Input } from '../components/ui';
import MarkdownEditor from '../components/MarkdownEditor';
import './TeamManage.css';

function EditTeamModal({ team, onClose, onSaved }) {
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(team.avatarUrl || '');
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
      await axios.put(`/api/teams/${team._id}`, {
        name: name.trim(),
        description: description.trim()
      });

      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await axios.post(`/api/teams/${team._id}/avatar`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="team-modal-overlay" onClick={onClose}>
      <motion.div
        className="team-modal"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal-header">
          <h2><Pencil size={18} /> Edit Team</h2>
          <button className="team-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="team-modal-body">
          <div className="team-avatar-picker">
            <label htmlFor="edit-team-avatar-input" className="team-avatar-picker-preview">
              {avatarPreview ? <img src={avatarPreview} alt="Team avatar preview" /> : <Upload size={22} />}
            </label>
            <input
              id="edit-team-avatar-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleAvatarPick}
              hidden
            />
          </div>

          <Input
            label="Team Name"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />

          <MarkdownEditor
            label="Description"
            value={description}
            onChange={setDescription}
            maxLength={2000}
          />

          {error && <p className="team-modal-error">{error}</p>}

          <div className="team-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>Save Changes</Button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function InviteMemberModal({ teamId, onClose, onInvited }) {
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`/api/team-invitations/team/${teamId}`, { username: username.trim() });
      onInvited();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="team-modal-overlay" onClick={onClose}>
      <motion.div
        className="team-modal"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="team-modal-header">
          <h2><UserPlus size={18} /> Invite Team Member</h2>
          <button className="team-modal-close" onClick={onClose} type="button"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="team-modal-body">
          <Input
            label="Username"
            required
            fullWidth
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. 0xobsyn"
          />
          <p className="team-modal-note">
            They'll get a notification and can accept or reject the invite --
            they're only added to the team once they accept.
          </p>
          {error && <p className="team-modal-error">{error}</p>}
          <div className="team-modal-actions">
            <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button variant="primary" type="submit" loading={submitting}>Send Invite</Button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}

function TeamManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useContext(AuthContext);

  const [team, setTeam] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [memberActionError, setMemberActionError] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      const res = await axios.get(`/api/teams/${id}`);
      setTeam(res.data.data);
      setError(null);

      if (res.data.data?.canEdit) {
        try {
          const invRes = await axios.get(`/api/team-invitations/team/${id}`);
          setInvitations((invRes.data.data || []).filter((inv) => inv.status !== 'accepted'));
        } catch {
          // Non-critical -- the members list still renders without it
        }
      } else {
        setInvitations([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchTeam();
  }, [authLoading, isAuthenticated, fetchTeam, navigate]);

  const handleRemoveMember = async (memberId) => {
    setMemberActionError('');
    try {
      await axios.delete(`/api/teams/${id}/members/${memberId}`);
      fetchTeam();
    } catch (err) {
      setMemberActionError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="team-manage-container">
        <Loading text="LOADING TEAM..." />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="team-manage-container">
        <div className="team-manage-error">
          <p>{error || 'Team not found'}</p>
          <Button variant="secondary" onClick={() => navigate('/my-team')}>
            <ChevronLeft size={16} /> Back to My Teams
          </Button>
        </div>
      </div>
    );
  }

  const isSelf = (memberId) => user && (user._id === memberId || user.id === memberId);

  return (
    <div className="team-manage-page">
      <button className="team-manage-back" onClick={() => navigate('/my-team')} type="button">
        <ChevronLeft size={16} /> My Teams
      </button>

      <div className="team-manage-grid">
        <div className="team-manage-card">
          <div className="team-manage-card-header">
            <div className="team-manage-identity">
              <span className="team-manage-avatar">
                {team.avatarUrl ? <img src={team.avatarUrl} alt={team.name} /> : <User size={20} />}
              </span>
              <h1>{team.name}</h1>
            </div>
            {team.canEdit && (
              <Button variant="primary" size="sm" icon={<Pencil size={14} />} onClick={() => setShowEditModal(true)}>
                Edit Team
              </Button>
            )}
          </div>

          <div className="team-manage-description">
            {team.description?.trim() ? (
              <ReactMarkdown>{team.description}</ReactMarkdown>
            ) : (
              <p className="team-manage-description-empty">No description yet.</p>
            )}
          </div>
        </div>

        <div className="team-manage-card">
          <div className="team-manage-card-header">
            <h2>Members</h2>
            {team.canEdit && (
              <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowInviteModal(true)}>
                Add Team Member
              </Button>
            )}
          </div>

          {memberActionError && <p className="team-modal-error">{memberActionError}</p>}

          <ul className="team-manage-members">
            {team.members.map((member) => {
              const isLeader = team.captain && (team.captain._id === member._id);
              const canRemove = team.canEdit || isSelf(member._id);
              return (
                <li key={member._id} className="team-manage-member">
                  <div className="team-manage-member-info">
                    <span className="team-manage-member-avatar"><User size={16} /></span>
                    <div>
                      <div className="team-manage-member-name">
                        {member.username}
                        {isLeader && <span className="team-manage-leader-badge"><Crown size={11} /> Leader</span>}
                      </div>
                      <div className="team-manage-member-handle">@{member.username}</div>
                    </div>
                  </div>
                  {canRemove && team.members.length > 1 && (
                    <button
                      className="team-manage-member-remove"
                      onClick={() => handleRemoveMember(member._id)}
                      title={isSelf(member._id) ? 'Leave team' : 'Remove member'}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>
              );
            })}

            {invitations.map((inv) => (
              <li key={inv._id} className="team-manage-member team-manage-invitation">
                <div className="team-manage-member-info">
                  <span className="team-manage-member-avatar"><User size={16} /></span>
                  <div>
                    <div className="team-manage-member-name">
                      {inv.invitedUser?.username || 'Unknown user'}
                    </div>
                    <div className="team-manage-member-handle">@{inv.invitedUser?.username}</div>
                  </div>
                </div>
                <span className={`team-manage-invite-status team-manage-invite-status--${inv.status}`}>
                  {inv.status === 'pending' ? 'Pending' : 'Rejected'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditTeamModal
            team={team}
            onClose={() => setShowEditModal(false)}
            onSaved={() => {
              setShowEditModal(false);
              fetchTeam();
            }}
          />
        )}
        {showInviteModal && (
          <InviteMemberModal
            teamId={id}
            onClose={() => setShowInviteModal(false)}
            onInvited={() => {
              setShowInviteModal(false);
              fetchTeam();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeamManage;
