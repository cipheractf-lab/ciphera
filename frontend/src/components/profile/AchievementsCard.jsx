import React, { useState } from 'react';
import { ACHIEVEMENTS, getUnlockedAchievements, getAchievementProgress } from '../../utils/gamification';
import './ProfileComponents.css';

const AchievementsCard = ({ user, challenges }) => {
  const [showAll, setShowAll] = useState(false);
  
  const unlockedAchievements = getUnlockedAchievements(user, challenges);
  const displayAchievements = showAll ? ACHIEVEMENTS : unlockedAchievements;
  
  return (
    <div className="achievements-card">
      <div className="achievements-header">
        <h3>Achievements</h3>
        <div className="achievements-stats">
          <span>{unlockedAchievements.length} / {ACHIEVEMENTS.length} unlocked</span>
          <button 
            className="toggle-achievements-btn"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Unlocked' : 'Show All'}
          </button>
        </div>
      </div>
      
      <div className="achievements-grid">
        {displayAchievements.map(achievement => {
          const isUnlocked = unlockedAchievements.includes(achievement);
          const progress = getAchievementProgress(achievement, user, challenges);
          
          return (
            <div 
              key={achievement.id} 
              className={`achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-content">
                <h4 className="achievement-name">{achievement.name}</h4>
                <p className="achievement-description">{achievement.description}</p>
                
                <div className="achievement-progress-container">
                  <div className="achievement-progress-bar">
                    <div 
                      className="achievement-progress-fill" 
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="achievement-progress-text">
                    {progress.current} / {progress.total}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {displayAchievements.length === 0 && (
        <div className="no-achievements">
          <p>No achievements unlocked yet. Start solving challenges!</p>
        </div>
      )}
    </div>
  );
};

export default AchievementsCard;
