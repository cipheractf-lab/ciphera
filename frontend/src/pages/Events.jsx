import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compass, Calendar, Clock, ExternalLink, Radio } from 'lucide-react';
import axios from 'axios';
import { Loading } from '../components/ui';
import './Events.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios.get('/api/events')
      .then((res) => {
        if (!cancelled) setEvents(res.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load events right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="events-page">
      <div className="events-grid-bg" aria-hidden="true" />

      <motion.div
        className="events-header"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="events-header-icon">
          <Compass size={22} />
        </div>
        <div>
          <h1>Explore Events</h1>
          <p>Discover and join public CTF events.</p>
        </div>
      </motion.div>

      {loading ? (
        <Loading />
      ) : error ? (
        <div className="events-empty">
          <p>{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="events-empty">
          <Radio size={28} />
          <p>No events have been posted yet. Check back soon.</p>
        </div>
      ) : (
        <div className="events-grid">
          {events.map((event, index) => (
            <motion.div
              key={event._id}
              className="event-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4) }}
            >
              <div className="event-card-top">
                <div className="event-card-icon">
                  <Compass size={22} />
                </div>
                <h3 className="event-card-title">{event.title}</h3>
              </div>

              <p className="event-card-description">{event.description}</p>

              <div className="event-card-meta">
                <span>
                  <Calendar size={14} /> {formatDate(event.eventDate)}
                </span>
                <span>
                  <Clock size={14} /> {formatTime(event.eventDate)}
                </span>
              </div>

              <div className="event-card-footer">
                <a
                  href={event.eventUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-view-btn"
                >
                  View <ExternalLink size={15} />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Events;
