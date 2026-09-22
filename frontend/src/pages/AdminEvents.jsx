import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, AlertCircle, CheckCircle, ExternalLink, EyeOff, Eye } from 'lucide-react';
import axios from 'axios';
import './AdminEvents.css';

const emptyForm = { title: '', description: '', date: '', time: '', eventUrl: '' };

// Split a stored ISO date into the separate <input type="date"> / <input type="time">
// values the form uses, in the browser's local time.
function splitDateTime(iso) {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return { date, time: `${hh}:${mm}` };
}

function combineDateTime(date, time) {
  if (!date || !time) return null;
  const combined = new Date(`${date}T${time}`);
  return Number.isNaN(combined.getTime()) ? null : combined.toISOString();
}

function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState(emptyForm);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/events/admin/all');
      setEvents(res.data?.data || []);
    } catch {
      showAlert('error', 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleCreate = async () => {
    const { title, description, date, time, eventUrl } = form;
    if (!title || !description || !date || !time || !eventUrl) {
      showAlert('error', 'Please fill in every field');
      return;
    }
    const eventDate = combineDateTime(date, time);
    if (!eventDate) {
      showAlert('error', 'Invalid date or time');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/events', { title, description, eventDate, eventUrl });
      setEvents([res.data.data, ...events]);
      setForm(emptyForm);
      showAlert('success', 'Event created successfully');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;

    try {
      setLoading(true);
      await axios.delete(`/api/events/${event._id}`);
      setEvents(events.filter((e) => e._id !== event._id));
      showAlert('success', 'Event deleted successfully');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (event) => {
    try {
      setLoading(true);
      const res = await axios.put(`/api/events/${event._id}`, { isActive: !event.isActive });
      setEvents(events.map((e) => (e._id === event._id ? res.data.data : e)));
      showAlert('success', res.data.data.isActive ? 'Event is now visible' : 'Event is now hidden');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (event) => {
    setEditingId(event._id);
    const { date, time } = splitDateTime(event.eventDate);
    setEditingForm({ title: event.title, description: event.description, date, time, eventUrl: event.eventUrl });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingForm(emptyForm);
  };

  const saveEdit = async () => {
    const { title, description, date, time, eventUrl } = editingForm;
    if (!title || !description || !date || !time || !eventUrl) {
      showAlert('error', 'Please fill in every field');
      return;
    }
    const eventDate = combineDateTime(date, time);
    if (!eventDate) {
      showAlert('error', 'Invalid date or time');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.put(`/api/events/${editingId}`, { title, description, eventDate, eventUrl });
      setEvents(events.map((e) => (e._id === editingId ? res.data.data : e)));
      cancelEdit();
      showAlert('success', 'Event updated successfully');
    } catch (err) {
      showAlert('error', err.response?.data?.message || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-events-container">
      <div className="admin-events-grid-bg" aria-hidden="true" />

      <motion.div
        className="admin-events-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="admin-events-header-content">
          <h1>Manage <span className="admin-events-highlight">Events</span></h1>
          <p>Post CTF events for users to discover on the Events page</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {alert.show && (
          <motion.div
            className={`admin-events-alert admin-events-alert--${alert.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span>{alert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="admin-events-main">
        <div className="admin-events-section">
          <div className="admin-events-section-header">
            <h2>Post New Event</h2>
          </div>

          <div className="admin-events-form">
            <div className="admin-events-form-row">
              <div className="admin-events-field">
                <label>Event Name</label>
                <input
                  type="text"
                  placeholder="e.g., ByteMe CTF 26"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="admin-events-input"
                />
              </div>
              <div className="admin-events-field">
                <label>Event URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/ctf"
                  value={form.eventUrl}
                  onChange={(e) => setForm({ ...form, eventUrl: e.target.value })}
                  className="admin-events-input"
                />
              </div>
            </div>

            <div className="admin-events-field">
              <label>Description</label>
              <textarea
                placeholder="What is this event about?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="admin-events-textarea"
                rows={3}
              />
            </div>

            <div className="admin-events-form-row">
              <div className="admin-events-field">
                <label>Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="admin-events-input"
                />
              </div>
              <div className="admin-events-field">
                <label>Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="admin-events-input"
                />
              </div>

              <motion.button
                className="admin-events-btn-add"
                onClick={handleCreate}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} />
                <span>Post Event</span>
              </motion.button>
            </div>
          </div>
        </div>

        <div className="admin-events-section">
          <div className="admin-events-section-header">
            <h2>Existing Events ({events.length})</h2>
          </div>

          <div className="admin-events-list">
            {events.map((event) => (
              <motion.div
                key={event._id}
                className={`admin-events-card${event.isActive ? '' : ' admin-events-card--hidden'}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                {editingId === event._id ? (
                  <div className="admin-events-edit-mode">
                    <div className="admin-events-form-row">
                      <input
                        type="text"
                        value={editingForm.title}
                        onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                        className="admin-events-input"
                        placeholder="Event name"
                      />
                      <input
                        type="text"
                        value={editingForm.eventUrl}
                        onChange={(e) => setEditingForm({ ...editingForm, eventUrl: e.target.value })}
                        className="admin-events-input"
                        placeholder="Event URL"
                      />
                    </div>
                    <textarea
                      value={editingForm.description}
                      onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                      className="admin-events-textarea"
                      rows={2}
                    />
                    <div className="admin-events-form-row">
                      <input
                        type="date"
                        value={editingForm.date}
                        onChange={(e) => setEditingForm({ ...editingForm, date: e.target.value })}
                        className="admin-events-input"
                      />
                      <input
                        type="time"
                        value={editingForm.time}
                        onChange={(e) => setEditingForm({ ...editingForm, time: e.target.value })}
                        className="admin-events-input"
                      />
                      <div className="admin-events-edit-actions">
                        <motion.button className="admin-events-btn-save" onClick={saveEdit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Save size={16} />
                        </motion.button>
                        <motion.button className="admin-events-btn-cancel" onClick={cancelEdit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <X size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="admin-events-view-mode">
                    <div className="admin-events-info">
                      <div className="admin-events-title-row">
                        <span className="admin-events-title">{event.title}</span>
                        {!event.isActive && <span className="admin-events-badge">Hidden</span>}
                      </div>
                      <p className="admin-events-description">{event.description}</p>
                      <div className="admin-events-meta">
                        <span>{new Date(event.eventDate).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <a href={event.eventUrl} target="_blank" rel="noopener noreferrer">
                          {event.eventUrl} <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                    <div className="admin-events-actions">
                      <motion.button
                        className="admin-events-btn-icon"
                        onClick={() => handleToggleActive(event)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title={event.isActive ? 'Hide from Events page' : 'Show on Events page'}
                      >
                        {event.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                      </motion.button>
                      <motion.button
                        className="admin-events-btn-icon"
                        onClick={() => startEdit(event)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Edit event"
                      >
                        <Edit2 size={18} />
                      </motion.button>
                      <motion.button
                        className="admin-events-btn-icon admin-events-btn-icon--danger"
                        onClick={() => handleDelete(event)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Delete event"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {events.length === 0 && !loading && (
              <p className="admin-events-empty">No events posted yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminEvents;
