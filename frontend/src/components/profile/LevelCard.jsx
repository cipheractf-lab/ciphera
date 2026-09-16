import React from 'react';
import { getUserLevel, getNextLevel, getLevelProgress, getPointsToNextLevel } from '../../utils/gamification';
import './ProfileComponents.css';

const LevelCard = ({ points }) => {
  const currentLevel = getUserLevel(points);
  const nextLevel = getNextLevel(points);
  const progress = getLevelProgress(points);
  const pointsToNext = getPointsToNextLevel(points);
  
  return (
    <div className="level-card">
      <div className="level-header">
        <div className="level-badge" style={{ backgroundColor: currentLevel.color }}>
          {currentLevel.level}
        </div>
        <div className="level-info">
          <h3 className="level-title">{currentLevel.name}</h3>
          <p className="level-subtitle">Level {currentLevel.level}</p>
        </div>
      </div>
      
      <div className="level-progress-container">
        <div className="level-progress-bar">
          <div 
            className="level-progress-fill" 
            style={{ 
              width: `${progress}%`,
              backgroundColor: currentLevel.color
            }}
          ></div>
        </div>
        <div className="level-progress-text">
          <span>{points} / {currentLevel.maxPoints} points</span>
          <span>{progress}%</span>
        </div>
      </div>
      
      {currentLevel.level < 10 && (
        <div className="next-level-info">
          <p>
            <span className="next-level-label">Next Level:</span> 
            <span className="next-level-name" style={{ color: nextLevel.color }}>
              {nextLevel.name} (Level {nextLevel.level})
            </span>
          </p>
          <p className="points-needed">
            {pointsToNext} points needed
          </p>
        </div>
      )}
      
      {currentLevel.level === 10 && (
        <div className="max-level-reached">
          <p>Maximum level reached! 🎉</p>
        </div>
      )}
    </div>
  );
};

export default LevelCard;
