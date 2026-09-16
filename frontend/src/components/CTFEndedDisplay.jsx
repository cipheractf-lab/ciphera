import React from 'react';
import './EventMessage.css';

const CTFEndedDisplay = ({ endedAt }) => {
    return (
        <div className="event-message-container ended">
            <div className="event-message-content">
                <div className="ended-icon">🏁</div>
                <h2 className="ended-title">CTF Has Ended</h2>
                <p className="ended-subtitle">
                    The competition has concluded
                </p>
                {endedAt && (
                    <p className="ended-time">
                        Ended at: {new Date(endedAt).toLocaleString()}
                    </p>
                )}
                <div className="ended-message">
                    <p>Thank you for participating!</p>
                    <p>The leaderboard has been frozen and submissions are no longer accepted.</p>
                </div>
            </div>
        </div>
    );
};

export default CTFEndedDisplay;
