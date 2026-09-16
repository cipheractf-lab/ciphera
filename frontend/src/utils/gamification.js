// Gamification utility functions and constants

// Level system configuration
export const LEVELS = [
  { level: 1, name: "Newbie", minPoints: 0, maxPoints: 99, color: "#808080" },
  { level: 2, name: "Script Kiddie", minPoints: 100, maxPoints: 299, color: "#00cc00" },
  { level: 3, name: "Hacker", minPoints: 300, maxPoints: 599, color: "#0099ff" },
  { level: 4, name: "Security Analyst", minPoints: 600, maxPoints: 999, color: "#ff9900" },
  { level: 5, name: "Cyber Specialist", minPoints: 1000, maxPoints: 1499, color: "#cc00ff" },
  { level: 6, name: "Elite Hacker", minPoints: 1500, maxPoints: 2099, color: "#ff0066" },
  { level: 7, name: "Security Expert", minPoints: 2100, maxPoints: 2799, color: "#ffcc00" },
  { level: 8, name: "Master Hacker", minPoints: 2800, maxPoints: 3599, color: "#00ffcc" },
  { level: 9, name: "Cyber Wizard", minPoints: 3600, maxPoints: 4499, color: "#9900ff" },
  { level: 10, name: "Legendary", minPoints: 4500, maxPoints: Infinity, color: "#ff0000" }
];

// Achievement definitions
export const ACHIEVEMENTS = [
  {
    id: "first_blood",
    name: "First Blood",
    description: "Solve your first challenge",
    icon: "🩸",
    condition: (user) => user.solvedChallenges?.length >= 1,
    progress: (user) => Math.min(user.solvedChallenges?.length || 0, 1),
    total: 1
  },
  {
    id: "web_novice",
    name: "Web Novice",
    description: "Solve 3 web exploitation challenges",
    icon: "🌐",
    condition: (user, challenges) => getCategoryCount(user, challenges, "web") >= 3,
    progress: (user, challenges) => getCategoryCount(user, challenges, "web"),
    total: 3
  },
  {
    id: "web_expert",
    name: "Web Expert",
    description: "Solve all web exploitation challenges",
    icon: "🔥",
    condition: (user, challenges) => getCategoryCount(user, challenges, "web") >= getCategoryTotal(challenges, "web"),
    progress: (user, challenges) => getCategoryCount(user, challenges, "web"),
    total: (challenges) => getCategoryTotal(challenges, "web")
  },
  {
    id: "crypto_novice",
    name: "Crypto Novice",
    description: "Solve 3 cryptography challenges",
    icon: "🔐",
    condition: (user, challenges) => getCategoryCount(user, challenges, "crypto") >= 3,
    progress: (user, challenges) => getCategoryCount(user, challenges, "crypto"),
    total: 3
  },
  {
    id: "crypto_expert",
    name: "Crypto Expert",
    description: "Solve all cryptography challenges",
    icon: "🔒",
    condition: (user, challenges) => getCategoryCount(user, challenges, "crypto") >= getCategoryTotal(challenges, "crypto"),
    progress: (user, challenges) => getCategoryCount(user, challenges, "crypto"),
    total: (challenges) => getCategoryTotal(challenges, "crypto")
  },
  {
    id: "forensics_novice",
    name: "Forensics Novice",
    description: "Solve 3 forensics challenges",
    icon: "🔍",
    condition: (user, challenges) => getCategoryCount(user, challenges, "forensics") >= 3,
    progress: (user, challenges) => getCategoryCount(user, challenges, "forensics"),
    total: 3
  },
  {
    id: "forensics_expert",
    name: "Forensics Expert",
    description: "Solve all forensics challenges",
    icon: "🔎",
    condition: (user, challenges) => getCategoryCount(user, challenges, "forensics") >= getCategoryTotal(challenges, "forensics"),
    progress: (user, challenges) => getCategoryCount(user, challenges, "forensics"),
    total: (challenges) => getCategoryTotal(challenges, "forensics")
  },
  {
    id: "reverse_novice",
    name: "Reverse Engineering Novice",
    description: "Solve 3 reverse engineering challenges",
    icon: "⚙️",
    condition: (user, challenges) => getCategoryCount(user, challenges, "reverse") >= 3,
    progress: (user, challenges) => getCategoryCount(user, challenges, "reverse"),
    total: 3
  },
  {
    id: "reverse_expert",
    name: "Reverse Engineering Expert",
    description: "Solve all reverse engineering challenges",
    icon: "🔧",
    condition: (user, challenges) => getCategoryCount(user, challenges, "reverse") >= getCategoryTotal(challenges, "reverse"),
    progress: (user, challenges) => getCategoryCount(user, challenges, "reverse"),
    total: (challenges) => getCategoryTotal(challenges, "reverse")
  },
  {
    id: "misc_novice",
    name: "Miscellaneous Novice",
    description: "Solve 3 miscellaneous challenges",
    icon: "🧩",
    condition: (user, challenges) => getCategoryCount(user, challenges, "misc") >= 3,
    progress: (user, challenges) => getCategoryCount(user, challenges, "misc"),
    total: 3
  },
  {
    id: "misc_expert",
    name: "Miscellaneous Expert",
    description: "Solve all miscellaneous challenges",
    icon: "🎯",
    condition: (user, challenges) => getCategoryCount(user, challenges, "misc") >= getCategoryTotal(challenges, "misc"),
    progress: (user, challenges) => getCategoryCount(user, challenges, "misc"),
    total: (challenges) => getCategoryTotal(challenges, "misc")
  },
  {
    id: "all_rounder",
    name: "All-Rounder",
    description: "Solve at least one challenge from each category",
    icon: "🌟",
    condition: (user, challenges) => {
      const categories = ["web", "crypto", "forensics", "reverse", "misc"];
      return categories.every(cat => getCategoryCount(user, challenges, cat) >= 1);
    },
    progress: (user, challenges) => {
      const categories = ["web", "crypto", "forensics", "reverse", "misc"];
      return categories.filter(cat => getCategoryCount(user, challenges, cat) >= 1).length;
    },
    total: 5
  },
  {
    id: "master_of_all",
    name: "Master of All",
    description: "Solve all challenges in the platform",
    icon: "👑",
    condition: (user, challenges) => user.solvedChallenges?.length >= challenges.length,
    progress: (user, challenges) => user.solvedChallenges?.length || 0,
    total: (challenges) => challenges.length
  }
];

// Helper functions
export function getUserLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function getNextLevel(points) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (points < LEVELS[i].maxPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[LEVELS.length - 1];
}

export function getLevelProgress(points) {
  const currentLevel = getUserLevel(points);
  const nextLevelPoints = currentLevel.maxPoints;
  const currentLevelPoints = currentLevel.minPoints;
  
  if (currentLevel.level === LEVELS[LEVELS.length - 1].level) {
    return 100; // Max level reached
  }
  
  const totalPointsInLevel = nextLevelPoints - currentLevelPoints;
  const pointsInCurrentLevel = points - currentLevelPoints;
  
  return Math.floor((pointsInCurrentLevel / totalPointsInLevel) * 100);
}

export function getPointsToNextLevel(points) {
  const currentLevel = getUserLevel(points);
  
  if (currentLevel.level === LEVELS[LEVELS.length - 1].level) {
    return 0; // Max level reached
  }
  
  return currentLevel.maxPoints - points + 1;
}

export function getCategoryCount(user, challenges, category) {
  if (!user.solvedChallenges || !challenges) return 0;
  
  return challenges.filter(
    challenge => challenge.category === category && user.solvedChallenges.includes(challenge._id)
  ).length;
}

export function getCategoryTotal(challenges, category) {
  if (!challenges) return 0;
  return challenges.filter(challenge => challenge.category === category).length;
}

export function getUnlockedAchievements(user, challenges) {
  return ACHIEVEMENTS.filter(achievement => achievement.condition(user, challenges));
}

export function getAchievementProgress(achievement, user, challenges) {
  const progress = achievement.progress(user, challenges);
  const total = typeof achievement.total === 'function' 
    ? achievement.total(challenges) 
    : achievement.total;
  
  return {
    current: progress,
    total: total,
    percentage: Math.floor((progress / total) * 100)
  };
}

export function getCategoryDistribution(user, challenges) {
  if (!user.solvedChallenges || !challenges) return {};
  
  const categories = ["web", "crypto", "forensics", "reverse", "misc"];
  const distribution = {};
  
  categories.forEach(category => {
    distribution[category] = getCategoryCount(user, challenges, category);
  });
  
  return distribution;
}
