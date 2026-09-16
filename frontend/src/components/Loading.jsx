import React from 'react';
import './Loading.css';

const Loading = ({
    text = 'Loading',
    size = 'large',
    inline = false
}) => {
    return (
        <div className={`loading-container ${inline ? 'loading-inline' : ''} loading-${size}`}>
            <div className="loading-content">
                <div className="loading-spinner">
                    <div className="spinner-bar"></div>
                    <div className="spinner-bar"></div>
                    <div className="spinner-bar"></div>
                </div>
                {text && <div className="loading-text">{text}</div>}
            </div>
        </div>
    );
};

export default Loading;
