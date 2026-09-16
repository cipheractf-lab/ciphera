import React from 'react';
import './EventMessage.css';

const CustomMessageDisplay = ({ message }) => {
    return (
        <div className="event-message-container">
            <div className="event-message-content">
                <h2 className="message-title">Announcement</h2>
                <p className="message-text">{message}</p>
            </div>
        </div>
    );
};

export default CustomMessageDisplay;
