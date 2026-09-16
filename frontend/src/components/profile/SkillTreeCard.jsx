import React from 'react';
import { getCategoryCount, getCategoryTotal } from '../../utils/gamification';
import './ProfileComponents.css';

const SkillTreeCard = ({ user, challenges }) => {
  const categories = [
    { id: 'web', name: 'Web Exploitation', icon: '🌐', color: '#00a8ff' },
    { id: 'crypto', name: 'Cryptography', icon: '🔐', color: '#9c88ff' },
    { id: 'forensics', name: 'Forensics', icon: '🔍', color: '#fbc531' },
    { id: 'reverse', name: 'Reverse Engineering', icon: '⚙️', color: '#4cd137' },
    { id: 'misc', name: 'Miscellaneous', icon: '🧩', color: '#e84118' }
  ];
  
  const getMasteryLevel = (solved, total) => {
    if (total === 0) return { name: 'N/A', color: '#ccc' };
    
    const percentage = (solved / total) * 100;
    
    if (percentage === 100) return { name: 'Master', color: '#ff0000' };
    if (percentage >= 80) return { name: 'Expert', color: '#9c88ff' };
    if (percentage >= 60) return { name: 'Advanced', color: '#4cd137' };
    if (percentage >= 40) return { name: 'Intermediate', color: '#fbc531' };
    if (percentage >= 20) return { name: 'Beginner', color: '#00a8ff' };
    if (percentage > 0) return { name: 'Novice', color: '#7f8fa6' };
    
    return { name: 'Untrained', color: '#353b48' };
  };
  
  return (
    <div className="skill-tree-card">
      <h3>Skill Tree</h3>
      
      <div className="skill-tree-grid">
        {categories.map(category => {
          const solved = getCategoryCount(user, challenges, category.id);
          const total = getCategoryTotal(challenges, category.id);
          const percentage = total > 0 ? Math.floor((solved / total) * 100) : 0;
          const mastery = getMasteryLevel(solved, total);
          
          return (
            <div key={category.id} className="skill-category">
              <div className="skill-header">
                <div className="skill-icon" style={{ backgroundColor: category.color }}>
                  {category.icon}
                </div>
                <div className="skill-info">
                  <h4>{category.name}</h4>
                  <div className="skill-mastery" style={{ color: mastery.color }}>
                    {mastery.name}
                  </div>
                </div>
              </div>
              
              <div className="skill-progress-container">
                <div className="skill-progress-bar">
                  <div 
                    className="skill-progress-fill" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
                <div className="skill-progress-text">
                  <span>{solved} / {total} challenges</span>
                  <span>{percentage}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SkillTreeCard;
