import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, UserPlus, Megaphone, Calendar, User } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './NotificationCenter.css';

const POLL_MS = 20000;

/**
 * One notification bell + panel for the whole app. Merges three
 * sources into a single feed, sorted by recency:
 *  - platform notices (admin announcements)         -> type 'notice'
 *  - pending team invitations sent TO the user       -> type 'invite'
 *  - responses to invitations the user sent, unseen  -> type 'response'
 * Replaces the old standalone /notices page and the separate
 * TeamInvitationsBell -- there is exactly one bell now.
 */
function NotificationCenter() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const userId = user?._id || user?.id;

  const [notices, setNotices] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [responses, setResponses] = useState([]);
  const [open, setOpen] = useState(false);
  const [expandedNoticeId, setExpandedNoticeId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [noticesRes, pendingRes, responsesRes] = await Promise.all([
        axios.get('/api/notices'),
        axios.get('/api/team-invitations/mine', { params: { status: 'pending' } }),
        axios.get('/api/team-invitations/sent/unseen')
      ]);
      setNotices(noticesRes.data.data || []);
      setPendingInvites(pendingRes.data.data || []);
      setResponses(responsesRes.data.data || []);
    } catch {
      // Non-critical -- the badge/panel simply won't update this cycle
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    fetchAll();
    const interval = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, userId, fetchAll]);

  useEffect(() => {
    // The panel is rendered via a portal to document.body, so it is
    // NOT a DOM descendant of wrapRef -- both refs must be checked,
    // or a click inside the panel (Accept/Reject, expanding a notice)
    // would be misread as "outside" and close the panel before the
    // click's own handler runs.
    const handleClickOutside = (e) => {
      const insideWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideWrap && !insideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadNoticeCount = userId
    ? notices.filter((n) => !(n.readBy || []).includes(userId)).length
    : notices.length;
  const totalCount = unreadNoticeCount + pendingInvites.length + responses.length;

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    }
    const opening = !open;
    setOpen(opening);
    if (opening) {
      if (responses.length > 0) {
        axios.post('/api/team-invitations/sent/mark-seen').catch(() => {});
      }
      if (unreadNoticeCount > 0) {
        axios.post('/api/notices/mark-all-read')
          .then(() => setNotices((prev) => prev.map((n) => ({ ...n, readBy: [...(n.readBy || []), userId] }))))
          .catch(() => {});
      }
    }
  };

  const respondToInvite = async (invId, action) => {
    setBusyId(invId);
    try {
      await axios.post(`/api/team-invitations/${invId}/${action}`);
      setPendingInvites((prev) => prev.filter((inv) => inv._id !== invId));
    } catch {
      // leave it in the list; user can retry
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) return null;

  const items = [
    ...notices.map((n) => ({ type: 'notice', id: n._id, date: n.createdAt, data: n })),
    ...pendingInvites.map((i) => ({ type: 'invite', id: i._id, date: i.createdAt, data: i })),
    ...responses.map((r) => ({ type: 'response', id: r._id, date: r.respondedAt || r.updatedAt, data: r }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="notif-center-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className="notif-center-btn"
        onClick={toggleOpen}
        title="Notifications"
      >
        <Bell size={18} />
        {totalCount > 0 && <span className="notif-center-badge">{totalCount > 9 ? '9+' : totalCount}</span>}
      </button>

      {open && anchor && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            className="notif-center-panel"
            style={{ top: anchor.top, right: anchor.right }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notif-center-header">Notifications</div>

            <div className="notif-center-body">
              {items.length === 0 && (
                <p className="notif-center-empty">No notifications.</p>
              )}

              {items.map((item) => {
                if (item.type === 'invite') {
                  const inv = item.data;
                  return (
                    <div key={item.id} className="notif-item">
                      <div className="notif-item-icon"><UserPlus size={15} /></div>
                      <div className="notif-item-body">
                        <p>
                          <strong>{inv.invitedBy?.username || 'Someone'}</strong> invited you to join{' '}
                          <strong>{inv.team?.name || 'a team'}</strong>
                        </p>
                        <div className="notif-item-actions">
                          <button
                            type="button"
                            className="notif-accept"
                            disabled={busyId === inv._id}
                            onClick={() => respondToInvite(inv._id, 'accept')}
                          >
                            <Check size={13} /> Accept
                          </button>
                          <button
                            type="button"
                            className="notif-reject"
                            disabled={busyId === inv._id}
                            onClick={() => respondToInvite(inv._id, 'reject')}
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (item.type === 'response') {
                  const inv = item.data;
                  return (
                    <div key={item.id} className="notif-item">
                      <div className={`notif-item-icon notif-status-${inv.status}`}>
                        {inv.status === 'accepted' ? <Check size={15} /> : <X size={15} />}
                      </div>
                      <div className="notif-item-body">
                        <p>
                          <strong>{inv.invitedUser?.username || 'Someone'}</strong>{' '}
                          <span className={`notif-status-text notif-status-${inv.status}`}>
                            {inv.status === 'accepted' ? 'accepted' : 'rejected'}
                          </span>{' '}
                          your invite to <strong>{inv.team?.name || 'your team'}</strong>
                        </p>
                      </div>
                    </div>
                  );
                }

                // notice
                const notice = item.data;
                const isRead = userId ? (notice.readBy || []).includes(userId) : true;
                const isExpanded = expandedNoticeId === notice._id;
                return (
                  <div key={item.id} className="notif-item">
                    <div className="notif-item-icon notif-item-icon--notice"><Megaphone size={15} /></div>
                    <div className="notif-item-body">
                      <button
                        type="button"
                        className="notif-notice-toggle"
                        onClick={() => setExpandedNoticeId(isExpanded ? null : notice._id)}
                      >
                        <span className={`notif-notice-title${!isRead ? ' notif-notice-title--unread' : ''}`}>
                          {notice.title}
                        </span>
                        {!isRead && <span className="notif-unread-dot" aria-hidden="true" />}
                      </button>
                      <div className="notif-notice-meta">
                        <span><User size={11} /> {notice.createdBy?.username || 'admin'}</span>
                        <span><Calendar size={11} /> {new Date(notice.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {isExpanded && (
                        <p className="notif-notice-description">{notice.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default NotificationCenter;
