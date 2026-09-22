import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Shield, Trophy, Bell, Mail, Activity, 
  Settings, AlertTriangle, Search, Plus, Edit, Trash2,
  Eye, EyeOff, ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Loading } from '../components/ui';
import './AdminDashboard.css';

function AdminDashboard() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('users');
  const [successMessage, setSuccessMessage] = useState('');
  const [subscribers, setSubscribers] = useState([]);

  const [userPage, setUserPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [challengePage, setChallengePage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [teamTotal, setTeamTotal] = useState(0);
  const [challengeTotal, setChallengeTotal] = useState(0);
  const [noticeTotal, setNoticeTotal] = useState(0);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [userSortBy, setUserSortBy] = useState('createdAt');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    description: ''
  });
  const itemsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(userSearchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      if (!debouncedSearchTerm) {
        setLoading(true);
      } else {
        setSearchLoading(true);
      }
      setError(null);

      try {
        let usersRes;
        if (debouncedSearchTerm) {
          usersRes = await axios.get(`/api/auth/users?all=true&view=admin&search=${encodeURIComponent(debouncedSearchTerm)}`);
          setUsers(usersRes.data.users || []);
          setUserTotal(usersRes.data.users?.length || 0);
        } else {
          // Fetch ALL users without pagination
          usersRes = await axios.get(`/api/auth/users?all=true&view=admin`);
          setUsers(usersRes.data.users || []);
          setUserTotal(usersRes.data.users?.length || 0);
        }

        if (!debouncedSearchTerm) {
          const [challengesRes, subscribersRes, teamsRes, noticesRes] = await Promise.all([
            axios.get(`/api/challenges?page=${challengePage}&limit=${itemsPerPage}`),
            axios.get('/api/newsletter/subscribers').catch(() => ({ data: [] })),
            axios.get(`/api/teams?page=${teamPage}&limit=${itemsPerPage}&view=admin`).catch(() => ({ data: { data: [] } })),
            axios.get('/api/notices').catch(() => ({ data: { data: [] } }))
          ]);

          setChallenges(challengesRes.data.data || []);
          setChallengeTotal(challengesRes.data.total || 0);
          setSubscribers(subscribersRes.data || []);
          setTeams(teamsRes.data.data || []);
          setTeamTotal(teamsRes.data.total || 0);
          setNotices(noticesRes.data.data || []);
          setNoticeTotal(noticesRes.data.data?.length || 0);
        }

        setLoading(false);
        setSearchLoading(false);
      } catch {
        setError('Failed to fetch data');
        setLoading(false);
        setSearchLoading(false);
      }
    };

    fetchData();
  }, [userPage, teamPage, challengePage, debouncedSearchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setUserPage(1);
    }
  }, [debouncedSearchTerm]);

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge?')) return;
    try {
      await axios.delete(`/api/challenges/${id}`);
      setChallenges(challenges.filter(c => c._id !== id));
      setSuccessMessage('Challenge deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete challenge');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await axios.delete(`/api/teams/${id}`);
      setTeams(teams.filter(t => t._id !== id));
      setSuccessMessage('Team deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete team');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm('Remove this subscriber?')) return;
    try {
      await axios.delete(`/api/newsletter/subscribers/${id}`);
      setSubscribers(subscribers.filter(s => s._id !== id));
      setSuccessMessage('Subscriber removed');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete subscriber');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleToggleVisibility = async (challengeId, currentVisibility) => {
    try {
      await axios.put(`/api/challenges/${challengeId}`, { isVisible: !currentVisibility });
      setChallenges(challenges.map(c =>
        c._id === challengeId ? { ...c, isVisible: !currentVisibility } : c
      ));
      setSuccessMessage(`Challenge ${!currentVisibility ? 'shown' : 'hidden'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to update visibility');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUserClick = (userId) => navigate(`/admin/users/${userId}`);

  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await axios.delete(`/api/notices/${id}`);
      setNotices(notices.filter(n => n._id !== id));
      setSuccessMessage('Notice deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch {
      setError('Failed to delete notice');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmitNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.description) {
      setError('Please fill in all fields');
      return;
    }

    try {
      if (editingNotice) {
        const response = await axios.put(`/api/notices/${editingNotice._id}`, noticeForm);
        setNotices(notices.map(n => n._id === editingNotice._id ? response.data.data : n));
        setSuccessMessage('Notice updated');
      } else {
        const response = await axios.post('/api/notices', noticeForm);
        setNotices([response.data.data, ...notices]);
        setSuccessMessage('Notice created');
      }

      setNoticeForm({ title: '', description: '' });
      setEditingNotice(null);
      setShowNoticeForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save notice');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setNoticeForm({ title: notice.title, description: notice.description });
    setShowNoticeForm(true);
  };

  const handleCancelNoticeForm = () => {
    setShowNoticeForm(false);
    setEditingNotice(null);
    setNoticeForm({ title: '', description: '' });
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && !(u.isBlocked || u.banned)) ||
      (userStatusFilter === 'blocked' && (u.isBlocked || u.banned));
    return matchesRole && matchesStatus;
  }).sort((a, b) => {
    switch (userSortBy) {
      case 'points': return (b.points || 0) - (a.points || 0);
      case 'username': return a.username.localeCompare(b.username);
      case 'email': return a.email.localeCompare(b.email);
      default: return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const handleChangeRole = async (userId, newRole) => {
    if (!window.confirm(`Change role to ${newRole}?`)) return;
    try {
      await axios.put(`/api/auth/users/${userId}/role`, { newRole });
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
      setSuccessMessage(`Role changed to ${newRole}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change role');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleBlockUser = async (userId, username, isCurrentlyBlocked) => {
    const action = isCurrentlyBlocked ? 'unblock' : 'block';
    const reason = isCurrentlyBlocked ? null : prompt('Reason for blocking (optional):');
    if (!isCurrentlyBlocked && reason === null) return;
    if (!window.confirm(`${action} user "${username}"?`)) return;

    try {
      await axios.put(`/api/auth/users/${userId}/block`, {
        isBlocked: !isCurrentlyBlocked,
        reason: reason || 'No reason provided'
      });
      setUsers(users.map(u => u._id === userId ? { ...u, isBlocked: !isCurrentlyBlocked, blockedReason: reason } : u));
      setSuccessMessage(`User ${action}ed`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Delete user "${username}"? Cannot be undone.`)) return;
    try {
      await axios.delete(`/api/auth/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      setSuccessMessage('User deleted');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateUserFields = async (userId, updates) => {
    try {
      const res = await axios.patch(`/api/auth/users/${userId}`, updates);
      const updated = res.data?.data || updates;
      setUsers(users.map(u => u._id === userId ? { ...u, ...updated } : u));
      setSuccessMessage('User updated');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleUpdateTeamFields = async (teamId, updates) => {
    try {
      const res = await axios.put(`/api/teams/${teamId}`, updates);
      const updated = res.data?.data || updates;
      setTeams(teams.map(t => t._id === teamId ? { ...t, ...updated } : t));
      setSuccessMessage('Team updated');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update team');
      setTimeout(() => setError(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="htb-admin-container">
        <div className="htb-admin-grid-bg"></div>
        <div className="htb-admin-orb htb-admin-orb--primary" aria-hidden="true" />
        <div className="htb-admin-orb htb-admin-orb--secondary" aria-hidden="true" />
        <div className="htb-admin-orb htb-admin-orb--tertiary" aria-hidden="true" />
        <Loading text="LOADING DASHBOARD..." />
      </div>
    );
  }

  const tabs = [
    { id: 'users', label: 'Users', count: userTotal, icon: Users },
    { id: 'teams', label: 'Teams', count: teamTotal, icon: Shield },
    { id: 'challenges', label: 'Challenges', count: challengeTotal, icon: Trophy },
    { id: 'notices', label: 'Notices', count: noticeTotal, icon: Bell },
    { id: 'subscribers', label: 'Subscribers', count: subscribers?.length || 0, icon: Mail },
  ];

  const navItems = [
    { label: 'Statistics', path: '/admin/statistics', icon: Activity },
    { label: 'Submissions', path: '/admin/submissions', icon: Trophy },
    { label: 'Categories', path: '/admin/categories', icon: Tag },
    { label: 'Live Monitor', path: '/admin/live-monitor', icon: Activity },

    { label: 'Messages', path: '/admin/messages', icon: Mail },
    { label: 'Login Logs', path: '/admin/login-logs', icon: Shield },
    { label: 'Platform Reset', path: '/admin/platform-reset', icon: AlertTriangle, danger: true },
  ];

  return (
    <div className="htb-admin-container">
      <div className="htb-admin-grid-bg"></div>
      <div className="htb-admin-orb htb-admin-orb--primary" aria-hidden="true" />
      <div className="htb-admin-orb htb-admin-orb--secondary" aria-hidden="true" />
      <div className="htb-admin-orb htb-admin-orb--tertiary" aria-hidden="true" />

      <motion.div 
        className="htb-admin-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="htb-admin-title">ADMIN <span className="htb-text-primary">DASHBOARD</span></h1>
        <p className="htb-admin-subtitle">Manage users, teams, challenges, and platform settings</p>
      </motion.div>

      <AnimatePresence>
        {successMessage && (
          <motion.div 
            className="htb-alert htb-alert-success"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {successMessage}
          </motion.div>
        )}
        {error && (
          <motion.div 
            className="htb-alert htb-alert-error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="htb-admin-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              className={`htb-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              <span className="htb-tab-count">{tab.count}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="htb-admin-nav">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={idx}
              className={`htb-nav-btn ${item.danger ? 'danger' : ''}`}
              onClick={() => navigate(item.path)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={16} />
              {item.label}
            </motion.button>
          );
        })}
      </div>

      <motion.div 
        className="htb-admin-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {activeTab === 'users' && (
          <div className="htb-section">
            <div className="htb-section-header">
              <h2><Users size={24} /> User Management</h2>
              <Link to="/admin/create-user" className="htb-btn-primary">
                <Plus size={16} /> Create User
              </Link>
            </div>

            <div className="htb-filters">
              <div className="htb-search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>
              <select value={userSortBy} onChange={(e) => setUserSortBy(e.target.value)}>
                <option value="createdAt">Newest First</option>
                <option value="points">Highest Points</option>
                <option value="username">Username (A-Z)</option>
                <option value="email">Email (A-Z)</option>
              </select>
              <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
              <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="htb-table-container">
              <table className="htb-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Team</th>
                    <th>Admin</th>
                    <th>Verified</th>
                    <th>Hidden</th>
                    <th>Banned</th>
                    <th>Points</th>
                    <th>Solved</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, idx) => (
                    <motion.tr 
                      key={u._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td>
                        <strong>{u.username}</strong>
                        {(u.banned || u.isBlocked) && <span className="htb-blocked-badge">🚫</span>}
                      </td>
                      <td className="htb-text-muted">{u.email}</td>
                      <td className="htb-text-info">{u.team?.name || '—'}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={u.role === 'admin'}
                          onChange={(e) => handleUpdateUserFields(u._id, { type: e.target.checked ? 'admin' : 'user' })}
                          disabled={false}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!(u.verified || u.isEmailVerified)}
                          onChange={(e) => handleUpdateUserFields(u._id, { verified: e.target.checked })}
                          disabled={false}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!u.hidden}
                          onChange={(e) => handleUpdateUserFields(u._id, { hidden: e.target.checked })}
                          disabled={false}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!(u.banned || u.isBlocked)}
                          onChange={(e) => handleUpdateUserFields(u._id, { banned: e.target.checked })}
                          disabled={false}
                        />
                      </td>
                      <td className="htb-text-primary"><strong>{u.points}</strong></td>
                      <td className="htb-text-info">{u.solvedChallenges?.length || 0}</td>
                      <td className="htb-text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="htb-actions">
                        <button className="htb-btn-icon" onClick={() => handleUserClick(u._id)}>
                          <Eye size={16} />
                        </button>
                        {user?.role === 'admin' && (
                          <>
                            <button 
                              className="htb-btn-icon" 
                              onClick={() => handleChangeRole(u._id, u.role === 'user' ? 'admin' : 'user')}
                            >
                              <Shield size={16} />
                            </button>
                            <button 
                              className={`htb-btn-icon ${u.isBlocked ? 'success' : 'warning'}`}
                              onClick={() => handleBlockUser(u._id, u.username, u.isBlocked)}
                            >
                              {u.isBlocked ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button 
                              className="htb-btn-icon danger" 
                              onClick={() => handleDeleteUser(u._id, u.username)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="htb-pagination">
              <span className="htb-pagination-info">
                {debouncedSearchTerm 
                  ? `Found ${filteredUsers.length} users matching "${debouncedSearchTerm}"`
                  : `Showing all ${filteredUsers.length} users`
                }
              </span>
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="htb-section">
            <div className="htb-section-header">
              <h2><Shield size={24} /> Team Management</h2>
              <Link to="/admin/create-team" className="htb-btn-primary">
                <Plus size={16} /> Create Team
              </Link>
            </div>

            <div className="htb-table-container">
              <table className="htb-table">
                <thead>
                  <tr>
                    <th>Team Name</th>
                    <th>Members</th>
                    <th>Hidden</th>
                    <th>Banned</th>
                    <th>Points</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((t, idx) => (
                    <motion.tr 
                      key={t._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td>
                        <Link to={`/teams/${t._id}`} className="htb-team-link">
                          <strong>{t.name}</strong>
                        </Link>
                      </td>
                      <td>{t.members?.length || 0}/2</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!t.hidden}
                          onChange={(e) => handleUpdateTeamFields(t._id, { hidden: e.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!(t.banned || t.isBlocked)}
                          onChange={(e) => handleUpdateTeamFields(t._id, { banned: e.target.checked })}
                        />
                      </td>
                      <td className="htb-text-primary"><strong>{t.points || 0}</strong></td>
                      <td className="htb-actions">
                        <button className="htb-btn-icon danger" onClick={() => handleDeleteTeam(t._id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="htb-pagination">
              <button
                onClick={() => setTeamPage(Math.max(1, teamPage - 1))}
                disabled={teamPage === 1}
                className="htb-pagination-btn"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="htb-pagination-info">
                Page {teamPage} of {Math.ceil(teamTotal / itemsPerPage) || 1}
              </span>
              <button
                onClick={() => setTeamPage(teamPage + 1)}
                disabled={teamPage >= Math.ceil(teamTotal / itemsPerPage)}
                className="htb-pagination-btn"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="htb-section">
            <div className="htb-section-header">
              <h2><Trophy size={24} /> Challenge Management</h2>
              <Link to="/create-challenge" className="htb-btn-primary">
                <Plus size={16} /> Create Challenge
              </Link>
            </div>

            <div className="htb-table-container">
              <table className="htb-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Points</th>
                    <th>Visibility</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {challenges.map((c, idx) => (
                    <motion.tr 
                      key={c._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td><strong>{c.title}</strong></td>
                      <td><span className="htb-badge">{c.category}</span></td>
                      <td className="htb-text-primary"><strong>{c.points}</strong></td>
                      <td>
                        <button
                          className={`htb-visibility-btn ${c.isVisible ? 'visible' : 'hidden'}`}
                          onClick={() => handleToggleVisibility(c._id, c.isVisible)}
                        >
                          {c.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                          {c.isVisible ? 'Visible' : 'Hidden'}
                        </button>
                      </td>
                      <td className="htb-actions">
                        <Link to={`/edit-challenge/${c._id}`} className="htb-btn-icon">
                          <Edit size={16} />
                        </Link>
                        <button className="htb-btn-icon danger" onClick={() => handleDeleteChallenge(c._id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="htb-pagination">
              <button
                onClick={() => setChallengePage(Math.max(1, challengePage - 1))}
                disabled={challengePage === 1}
                className="htb-pagination-btn"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="htb-pagination-info">
                Page {challengePage} of {Math.ceil(challengeTotal / itemsPerPage) || 1}
              </span>
              <button
                onClick={() => setChallengePage(challengePage + 1)}
                disabled={challengePage >= Math.ceil(challengeTotal / itemsPerPage)}
                className="htb-pagination-btn"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notices' && (
          <div className="htb-section">
            <div className="htb-section-header">
              <h2><Bell size={24} /> Notice Management</h2>
              <button
                className="htb-btn-primary"
                onClick={() => setShowNoticeForm(!showNoticeForm)}
              >
                {showNoticeForm ? '✕ Cancel' : <><Plus size={16} /> Create Notice</>}
              </button>
            </div>

            <AnimatePresence>
              {showNoticeForm && (
                <motion.form 
                  className="htb-form"
                  onSubmit={handleSubmitNotice}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="htb-form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      value={noticeForm.title}
                      onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                      placeholder="Enter notice title"
                      required
                    />
                  </div>

                  <div className="htb-form-group">
                    <label>Description *</label>
                    <textarea
                      value={noticeForm.description}
                      onChange={(e) => setNoticeForm({ ...noticeForm, description: e.target.value })}
                      placeholder="Enter notice description"
                      rows="6"
                      required
                    />
                  </div>

                  <div className="htb-form-actions">
                    <button type="submit" className="htb-btn-primary">
                      {editingNotice ? 'Update Notice' : 'Create Notice'}
                    </button>
                    <button type="button" className="htb-btn-secondary" onClick={handleCancelNoticeForm}>
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="htb-table-container">
              <table className="htb-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Created By</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((n, idx) => (
                    <motion.tr 
                      key={n._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td><strong>{n.title}</strong></td>
                      <td className="htb-text-muted">{n.createdBy?.username || 'Unknown'}</td>
                      <td className="htb-text-muted">{new Date(n.createdAt).toLocaleDateString()}</td>
                      <td className="htb-actions">
                        <button className="htb-btn-icon" onClick={() => handleEditNotice(n)}>
                          <Edit size={16} />
                        </button>
                        <button className="htb-btn-icon danger" onClick={() => handleDeleteNotice(n._id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {notices.length === 0 && (
              <div className="htb-empty-state">
                <Bell size={48} />
                <p>No notices yet. Create one to get started!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscribers' && (
          <div className="htb-section">
            <div className="htb-section-header">
              <h2><Mail size={24} /> Newsletter Subscribers</h2>
            </div>

            <div className="htb-table-container">
              <table className="htb-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Subscribed</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s, idx) => (
                    <motion.tr 
                      key={s._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <td><strong>{s.email}</strong></td>
                      <td className="htb-text-muted">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                      <td className="htb-actions">
                        <button className="htb-btn-icon danger" onClick={() => handleDeleteSubscriber(s._id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default AdminDashboard;
