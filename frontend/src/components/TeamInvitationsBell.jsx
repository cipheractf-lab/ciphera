import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Bell } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Badge } from './ui';
import './TeamInvitationsBell.css';

const POLL_MS = 20000;

function TeamInvitationsBell() {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [pending, setPending] = useState([]);
  const [responses, setResponses] = useState([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [pendingRes, responsesRes] = await Promise.all([
        axios.get('/api/team-invitations/mine', { params: { status: 'pending' } }),
        axios.get('/api/team-invitations/sent/unseen')
      ]);
      setPending(pendingRes.data.data || []);
      setResponses(responsesRes.data.data || []);
    } catch {
      // Non-critical -- notifications simply won't show this cycle
    }
  }, []);

  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    fetchAll();
    const interval = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, userId, fetchAll]);

  useEffect(() => {
    // The dropdown is rendered via a portal to document.body, so it's
    // NOT a DOM descendant of wrapRef -- must check both refs, or every
    // click inside the dropdown (e.g. Accept/Reject) would be
    // misread as an "outside" click and close the menu before the
    // button's own onClick gets a chance to run.
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

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen((v) => !v);
    if (!open && responses.length > 0) {
      axios.post('/api/team-invitations/sent/mark-seen').catch(() => {});
    }
  };

  const respond = async (invId, action) => {
    setBusyId(invId);
    try {
      await axios.post(`/api/team-invitations/${invId}/${action}`);
      setPending((prev) => prev.filter((inv) => inv._id !== invId));
    } catch {
      // leave it in the list; user can retry
    } finally {
      setBusyId(null);
    }
  };

  if (!isAuthenticated) return null;

  const totalCount = pending.length + responses.length;

  return (
    <div className="team-inv-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className="team-inv-bell-btn"
        onClick={toggleOpen}
        title="Team invitations"
      >
        <Bell size={18} />
        {totalCount > 0 && (
          <Badge variant="danger" size="sm" className="team-inv-bell-badge">
            {totalCount}
          </Badge>
        )}
      </button>

      {open && anchor && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            className="team-inv-dropdown"
            style={{ top: anchor.top, right: anchor.right }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="team-inv-dropdown-header">Team Invitations</div>

            {pending.length === 0 && responses.length === 0 && (
              <p className="team-inv-empty">Nothing new right now.</p>
            )}

            {pending.map((inv) => (
              <div key={inv._id} className="team-inv-item">
                <div className="team-inv-item-icon"><UserPlus size={15} /></div>
                <div className="team-inv-item-body">
                  <p>
                    <strong>{inv.invitedBy?.username || 'Someone'}</strong> invited you to join{' '}
                    <strong>{inv.team?.name || 'a team'}</strong>
                  </p>
                  <div className="team-inv-item-actions">
                    <button
                      type="button"
                      className="team-inv-accept"
                      disabled={busyId === inv._id}
                      onClick={() => respond(inv._id, 'accept')}
                    >
                      <Check size={13} /> Accept
                    </button>
                    <button
                      type="button"
                      className="team-inv-reject"
                      disabled={busyId === inv._id}
                      onClick={() => respond(inv._id, 'reject')}
                    >
                      <X size={13} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {responses.map((inv) => (
              <div key={inv._id} className="team-inv-item">
                <div className={`team-inv-item-icon team-inv-status-${inv.status}`}>
                  {inv.status === 'accepted' ? <Check size={15} /> : <X size={15} />}
                </div>
                <div className="team-inv-item-body">
                  <p>
                    <strong>{inv.invitedUser?.username || 'Someone'}</strong>{' '}
                    <span className={`team-inv-status-text team-inv-status-${inv.status}`}>
                      {inv.status === 'accepted' ? 'accepted' : 'rejected'}
                    </span>{' '}
                    your invite to <strong>{inv.team?.name || 'your team'}</strong>
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default TeamInvitationsBell;
