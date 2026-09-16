import React from 'react';
import { getCategoryDistribution } from '../../utils/gamification';
import './ProfileComponents.css';

const StatsCard = ({ user, challenges, rank, totalUsers }) => {
  const categoryDistribution = getCategoryDistribution(user, challenges);
  const totalSolved = user.solvedChallenges?.length || 0;
  const totalChallenges = challenges?.length || 0;
  const completionRate = totalChallenges > 0 
    ? Math.floor((totalSolved / totalChallenges) * 100) 
    : 0;
  
  // Calculate percentile if rank is available
  const percentile = rank && totalUsers 
    ? Math.floor(((totalUsers - rank) / totalUsers) * 100) 
    : null;
  
  const categories = [
    { id: 'web', name: 'Web', color: '#00a8ff', icon: '🌐' },
    { id: 'crypto', name: 'Crypto', color: '#9c88ff', icon: '🔐' },
    { id: 'forensics', name: 'Forensics', color: '#fbc531', icon: '🔍' },
    { id: 'reverse', name: 'Reverse', color: '#4cd137', icon: '⚙️' },
    { id: 'misc', name: 'Misc', color: '#e84118', icon: '🧩' }
  ];
  
  return (
    <div className="stats-card">
      <h3>Challenge Statistics</h3>
      
      <div className="stats-overview">
        <div className="stat-item">
          <div className="stat-value">{totalSolved}</div>
          <div className="stat-label">Challenges Solved</div>
        </div>
        
        <div className="stat-item">
          <div className="stat-value">{completionRate}%</div>
          <div className="stat-label">Completion Rate</div>
        </div>
        
        {rank && (
          <div className="stat-item">
            <div className="stat-value">#{rank}</div>
            <div className="stat-label">Rank</div>
          </div>
        )}
        
        {percentile !== null && (
          <div className="stat-item">
            <div className="stat-value">Top {100 - percentile}%</div>
            <div className="stat-label">Percentile</div>
          </div>
        )}
      </div>
      
      <h4>Category Breakdown</h4>
      <div className="category-breakdown">
        {categories.map(category => {
          const count = categoryDistribution[category.id] || 0;
          const total = challenges?.filter(c => c.category === category.id).length || 0;
          const percentage = total > 0 ? Math.floor((count / total) * 100) : 0;
          
          return (
            <div key={category.id} className="category-stat">
              <div className="category-header">
                <div className="category-icon" style={{ backgroundColor: category.color }}>
                  {category.icon}
                </div>
                <div className="category-info">
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{count}/{total}</span>
                </div>
              </div>
              
              <div className="category-progress-bar">
                <div 
                  className="category-progress-fill" 
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: category.color
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StatsCard;
