import { useEventState } from '../hooks/useEventState';
import { Loading } from '../components/ui';

function EventStatus() {
  const { eventState, loading, error, isStarted, isEnded, isNotStarted, isPaused, isFrozen } = useEventState();

  if (loading) {
    return <Loading text="LOADING EVENT STATUS..." />;
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '24px', color: '#e5eefc' }}>
      <h1>Event Status</h1>
      <p style={{ opacity: 0.85 }}>Live CTF competition state</p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.2)', border: '1px solid #ef4444', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'rgba(8,20,40,.8)', border: '1px solid rgba(56,189,248,.25)', borderRadius: 12, padding: 16 }}>
        <ul style={{ lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
          <li><strong>Status:</strong> {eventState?.status || 'unknown'}</li>
          <li><strong>Started:</strong> {isStarted ? 'Yes' : 'No'}</li>
          <li><strong>Not Started:</strong> {isNotStarted ? 'Yes' : 'No'}</li>
          <li><strong>Ended:</strong> {isEnded ? 'Yes' : 'No'}</li>
          <li><strong>Paused:</strong> {isPaused ? 'Yes' : 'No'}</li>
          <li><strong>Frozen:</strong> {isFrozen ? 'Yes' : 'No'}</li>
          <li><strong>Submissions Allowed:</strong> {eventState?.isSubmissionAllowed ? 'Yes' : 'No'}</li>
          <li><strong>Start Time:</strong> {eventState?.startedAt ? new Date(eventState.startedAt).toLocaleString() : 'Not set'}</li>
          <li><strong>End Time:</strong> {eventState?.endedAt ? new Date(eventState.endedAt).toLocaleString() : 'Not set'}</li>
          <li><strong>Freeze Time:</strong> {eventState?.freezeAt ? new Date(eventState.freezeAt).toLocaleString() : 'Not set'}</li>
          <li><strong>Message:</strong> {eventState?.customMessage || 'None'}</li>
        </ul>
      </div>
    </div>
  );
}

export default EventStatus;
