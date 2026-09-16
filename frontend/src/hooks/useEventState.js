import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Custom hook to fetch and manage CTF event state
 * @returns {Object} Event state and loading/error states
 */
export function useEventState() {
  const [eventState, setEventState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEventState = async () => {
    try {
      setError(null);
      const res = await axios.get('/api/event-control/status');
      setEventState(res.data.data);
    } catch (err) {
      console.error('Error fetching event state:', err);
      setError(err.response?.data?.message || 'Failed to fetch event state');
      // Set default state on error
      setEventState({ status: 'not_started', isPaused: false, isFrozen: false, isSubmissionAllowed: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventState();

    // Poll every 30 seconds to keep state updated
    const interval = setInterval(fetchEventState, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    eventState,
    customMessage: eventState?.customMessage,
    isStarted: eventState?.status === 'started',
    isEnded: eventState?.status === 'ended',
    isNotStarted: eventState?.status === 'not_started',
    isPaused: !!eventState?.isPaused,
    isFrozen: !!eventState?.isFrozen,
    isSubmissionAllowed: !!eventState?.isSubmissionAllowed,
    freezeAt: eventState?.freezeAt,
    loading,
    error,
    refresh: fetchEventState
  };
}
